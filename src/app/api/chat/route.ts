import { trackTicket, getUsageSummary } from "@/lib/billing/usage";
import { getShop, saveTicket, getSettings, type ShopSettings } from "@/lib/store";
import { logEvent } from "@/lib/events";
import { ShopifyClient } from "@/lib/shopify/client";
import { isValidShopDomain, verifyWidgetToken } from "@/lib/crypto";
import { captureException } from "@/lib/errors";
import { notifyMerchantReturn, notifyMerchantEscalation } from "@/lib/notify";
import type { OrderForDisplay } from "@/lib/shopify/types";

export const maxDuration = 30;

// --- In-memory rate limiter (sliding window, per-IP) ---

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(req: Request): boolean {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  let timestamps = rateBuckets.get(ip);
  if (!timestamps) {
    timestamps = [];
    rateBuckets.set(ip, timestamps);
  }
  // Evict old entries
  while (timestamps.length > 0 && timestamps[0] < now - RATE_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_MAX) return false;
  timestamps.push(now);
  return true;
}

// Periodic cleanup to prevent memory leak (every 5 minutes)
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { _rbRateCleanup?: boolean };
  if (!g._rbRateCleanup) {
    g._rbRateCleanup = true;
    setInterval(() => {
      const cutoff = Date.now() - RATE_WINDOW_MS * 2;
      for (const [ip, ts] of rateBuckets) {
        if (ts.length === 0 || ts[ts.length - 1] < cutoff) rateBuckets.delete(ip);
      }
    }, 300_000);
  }
}

const DEMO_ORDERS: OrderForDisplay[] = [
  {
    id: 100001,
    name: "#1001",
    date: "2026-03-15T10:30:00Z",
    status: "fulfilled",
    total: "129.99",
    currency: "USD",
    items: [
      { id: 200001, title: "Classic Runner Sneakers", variant: "White / Size 9", quantity: 1, price: "89.99", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop", productId: 300001, variantId: 400001 },
      { id: 200002, title: "Cotton Crew Socks (3-Pack)", variant: "Black", quantity: 1, price: "19.99", image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=200&h=200&fit=crop", productId: 300002, variantId: 400002 },
    ],
    tracking: {
      number: "1Z999AA10123456784", url: "https://www.ups.com/track?tracknum=1Z999AA10123456784", company: "UPS", status: "in_transit",
      events: [
        { status: "created", message: "Shipping label created", timestamp: "2026-03-15T14:00:00Z", location: "Los Angeles, CA" },
        { status: "picked_up", message: "Picked up by carrier", timestamp: "2026-03-15T18:00:00Z", location: "Los Angeles, CA" },
        { status: "in_transit", message: "In transit to destination", timestamp: "2026-03-16T09:00:00Z", location: "Phoenix, AZ" },
        { status: "out_for_delivery", message: "Out for delivery", timestamp: "2026-03-17T07:30:00Z", location: "Dallas, TX" },
      ],
    },
  },
  {
    id: 100002,
    name: "#1002",
    date: "2026-03-10T08:15:00Z",
    status: "fulfilled",
    total: "249.00",
    currency: "USD",
    items: [
      { id: 200003, title: "Wool Overcoat", variant: "Navy / Large", quantity: 1, price: "249.00", image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&h=200&fit=crop", productId: 300003, variantId: 400003 },
    ],
    tracking: {
      number: "9400111899223456789012", url: "#", company: "USPS", status: "delivered",
      events: [
        { status: "created", message: "Label created", timestamp: "2026-03-10T12:00:00Z", location: "New York, NY" },
        { status: "in_transit", message: "In transit", timestamp: "2026-03-11T06:00:00Z", location: "Philadelphia, PA" },
        { status: "delivered", message: "Delivered to mailbox", timestamp: "2026-03-12T14:22:00Z", location: "Chicago, IL" },
      ],
    },
  },
  {
    id: 100003,
    name: "#1003",
    date: "2026-03-17T16:45:00Z",
    status: "unfulfilled",
    total: "59.99",
    currency: "USD",
    items: [
      { id: 200004, title: "Graphic Print T-Shirt", variant: "Medium / Black", quantity: 2, price: "29.99", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop", productId: 300004, variantId: 400004 },
    ],
  },
];

const CONDITION_LABELS: Record<string, string> = {
  unused: "item must be unused",
  original_packaging: "original packaging required",
  with_tags: "tags must still be attached",
  within_window: "must be within return window",
  no_final_sale: "final sale items cannot be returned",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly: "Be warm, empathetic, and use a friendly conversational tone.",
  professional: "Be polite, formal, and maintain a professional business tone.",
  casual: "Be relaxed and casual, like chatting with a friend.",
};

const LANG_INSTRUCTIONS: Record<string, string> = {
  en: "Respond in English.",
  zh: "用中文回复客户。",
  ja: "日本語でお客様に返信してください。",
  ko: "한국어로 고객에게 응답하세요.",
  es: "Responde al cliente en español.",
  fr: "Répondez au client en français.",
  de: "Antworten Sie dem Kunden auf Deutsch.",
  pt: "Responda ao cliente em português.",
  it: "Rispondi al cliente in italiano.",
  nl: "Antwoord de klant in het Nederlands.",
  ru: "Отвечайте клиенту на русском языке.",
  ar: "الرد على العميل باللغة العربية.",
  hi: "ग्राहक को हिंदी में जवाब दें।",
  th: "ตอบลูกค้าเป็นภาษาไทย",
  vi: "Trả lời khách hàng bằng tiếng Việt.",
  tr: "Müşteriye Türkçe yanıt verin.",
  pl: "Odpowiedz klientowi po polsku.",
  sv: "Svara kunden på svenska.",
};

function buildSystemPrompt(customerEmail?: string, settings?: ShopSettings): string {
  const emailLine = customerEmail
    ? `The customer's email is ${customerEmail}. Use this email when calling lookup_orders.`
    : `When a customer mentions any order issue, call lookup_orders with email "demo@example.com".`;

  const policyLines: string[] = [];
  if (settings) {
    policyLines.push(`RETURN POLICY:`);
    policyLines.push(`- Return window: ${settings.returnWindowDays} days from delivery.`);
    if (settings.returnConditions.length > 0) {
      const conds = settings.returnConditions.map(c => CONDITION_LABELS[c] || c).join(", ");
      policyLines.push(`- Conditions: ${conds}.`);
    }
    policyLines.push(`- If a return request does not meet these conditions, politely explain why and suggest alternatives.`);
  }

  const toneInstr = settings ? (TONE_INSTRUCTIONS[settings.tone] || TONE_INSTRUCTIONS.friendly) : TONE_INSTRUCTIONS.friendly;
  const langInstr = settings && settings.language !== "en" ? (LANG_INSTRUCTIONS[settings.language] || "") : "";

  return `You are Auri, an AI customer support agent for a Shopify store.
You help shoppers with: checking orders, tracking shipments, and processing returns/exchanges.
${toneInstr}
${langInstr}

${policyLines.length > 0 ? policyLines.join("\n") + "\n" : ""}RULES:
- Be concise. Max 2 sentences per reply.
- ${emailLine}
- When a customer mentions any order issue, IMMEDIATELY call lookup_orders.
- After showing orders, ask which item they need help with.
- For returns/exchanges, call initiate_return with all required info.
- For tracking, call track_shipment with the order id.
- NEVER fabricate order data. Only use data from tool results.
- After completing a return, summarize next steps briefly.
- If you cannot help the customer after 2 attempts, call escalate_to_human with a summary.`;
}

type LlmConfig = {
  apiKey?: string;
  baseURL?: string;
  model: string;
};

function getLlmConfig(): LlmConfig {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  return { apiKey, baseURL, model };
}

function isLlmKeyValid(): boolean {
  const { apiKey } = getLlmConfig();
  return !!apiKey && apiKey.length > 20 && !apiKey.includes("replace");
}

type ChatMessage = { role: string; content?: string; parts?: Array<{ type: string; text?: string }> };

function getLastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const parts = messages[i].parts;
      if (parts) {
        const tp = parts.find((p) => p.type === "text" && p.text);
        if (tp) return tp.text!.toLowerCase();
      }
      if (messages[i].content) return messages[i].content!.toLowerCase();
    }
  }
  return "";
}

function hasPriorToolCall(messages: ChatMessage[], name: string): boolean {
  return messages.some(
    (m) => m.role === "assistant" && m.parts?.some((p) => (p as Record<string, unknown>).toolName === name),
  );
}

interface MockStep {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: Record<string, unknown>;
  text?: string;
}

function buildMockSteps(messages: ChatMessage[]): MockStep[] {
  const input = getLastUserText(messages);
  const hasOrders = hasPriorToolCall(messages, "lookup_orders");

  if (!hasOrders && (input.includes("order") || input.includes("return") || input.includes("track") || input.includes("package") || input.includes("查") || input.includes("退") || input.includes("换") || input.includes("物流"))) {
    return [
      {
        toolName: "lookup_orders",
        toolArgs: { email: "demo@example.com" },
        toolResult: { orders: DEMO_ORDERS, source: "demo" },
      },
      { text: "I found 3 orders on your account. Which one do you need help with?" },
    ];
  }

  if (hasOrders && (input.includes("return") || input.includes("退") || input.includes("换") || input.includes("size") || input.includes("exchange") || input.includes("sneaker") || input.includes("shoe") || input.includes("#1001") || input.includes("1001"))) {
    trackTicket("demo-store");
    const returnId = `RET-${Date.now().toString(36).toUpperCase()}`;
    saveTicket({ id: returnId, shop: "demo-store", customerEmail: "demo@example.com", orderName: "#1001", type: "return", status: "resolved", summary: "Exchange request: Classic Runner Sneakers — wrong size", createdAt: new Date().toISOString() });
    logEvent({ name: "ticket_created", shop: "demo-store", props: { type: "return", status: "resolved", source: "demo" } });
    return [
      {
        toolName: "initiate_return",
        toolArgs: { orderId: 100001, orderName: "#1001", itemId: 200001, itemTitle: "Classic Runner Sneakers", reason: "wrong_size", action: "exchange", exchangeDetails: "Size 10" },
        toolResult: {
          success: true,
          returnId,
          orderName: "#1001",
          itemTitle: "Classic Runner Sneakers",
          action: "exchange",
          reason: "wrong_size",
          exchangeDetails: "Size 10",
          instructions: {
            step1: "Pack the item in its original packaging",
            step2: "Print the return label (sent to your email)",
            step3: "Drop off at any UPS location",
            deadline: "Please ship within 14 days",
          },
          labelUrl: `https://example.com/label/${returnId}`,
        },
      },
      { text: "Your exchange has been created! Pack the sneakers in their original box and drop them at any UPS location within 14 days. Your new Size 10 pair will ship once we receive the return." },
    ];
  }

  if (hasOrders && (input.includes("track") || input.includes("物流") || input.includes("where") || input.includes("package") || input.includes("shipping") || input.includes("包裹"))) {
    const order = DEMO_ORDERS[0];
    return [
      {
        toolName: "track_shipment",
        toolArgs: { orderId: 100001, orderName: "#1001" },
        toolResult: { orderName: "#1001", ...order.tracking },
      },
      { text: "Your package is currently out for delivery in Dallas, TX via UPS. It should arrive today!" },
    ];
  }

  return [
    { text: "I can help you check your orders, track a shipment, or process a return. Just let me know what you need!" },
  ];
}

function buildMockSSE(steps: MockStep[]): string {
  const lines: string[] = [];

  lines.push(`data: {"type":"start"}\n`);

  const msgId = `mock-${Date.now()}`;

  for (const step of steps) {
    if (step.toolName && step.toolResult) {
      const callId = `call-${Date.now().toString(36)}`;
      lines.push(`data: ${JSON.stringify({ type: "tool-call", toolCallId: callId, toolName: step.toolName, args: step.toolArgs })}\n`);
      lines.push(`data: ${JSON.stringify({ type: "tool-result", toolCallId: callId, toolName: step.toolName, result: step.toolResult })}\n`);
    }
    if (step.text) {
      for (const char of step.text) {
        lines.push(`data: ${JSON.stringify({ type: "text-delta", textDelta: char })}\n`);
      }
    }
  }

  lines.push(`data: ${JSON.stringify({ type: "step-finish", messageId: msgId, finishReason: "stop" })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "finish", messageId: msgId, finishReason: "stop" })}\n`);

  return lines.join("\n");
}

function buildErrorSSE(message: string): string {
  const lines: string[] = [];
  const msgId = `err-${Date.now()}`;
  lines.push(`data: {"type":"start"}\n`);
  for (const char of message) {
    lines.push(`data: ${JSON.stringify({ type: "text-delta", textDelta: char })}\n`);
  }
  lines.push(`data: ${JSON.stringify({ type: "step-finish", messageId: msgId, finishReason: "stop" })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "finish", messageId: msgId, finishReason: "stop" })}\n`);
  return lines.join("\n");
}

function buildUsageLimitSSE(): string {
  const lines: string[] = [];
  const msgId = `limit-${Date.now()}`;
  lines.push(`data: {"type":"start"}\n`);
  const text = "Your free tier limit has been reached for this month (50 tickets). To continue using Auri, please contact us at support@imauri.com to upgrade your plan.";
  for (const char of text) {
    lines.push(`data: ${JSON.stringify({ type: "text-delta", textDelta: char })}\n`);
  }
  lines.push(`data: ${JSON.stringify({ type: "step-finish", messageId: msgId, finishReason: "stop" })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "finish", messageId: msgId, finishReason: "stop" })}\n`);
  return lines.join("\n");
}

function sseResponse(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

interface ResolvedShop {
  domain: string;
  client: ShopifyClient;
}

function resolveShop(shopDomain?: string): ResolvedShop | null {
  if (!shopDomain) return null;
  const record = getShop(shopDomain);
  if (!record?.accessToken) return null;
  return { domain: record.shop, client: new ShopifyClient(record.shop, record.accessToken) };
}

export async function POST(req: Request) {
  if (!checkRateLimit(req)) {
    return sseResponse(buildErrorSSE("Too many requests. Please wait a moment and try again."));
  }

  const { messages, shop: shopParam, customerEmail, widgetToken } = await req.json();

  if (shopParam && shopParam !== "demo-store") {
    if (!isValidShopDomain(shopParam)) {
      return sseResponse(buildErrorSSE("Invalid store configuration."));
    }
    if (!widgetToken || !verifyWidgetToken(shopParam, widgetToken)) {
      return sseResponse(buildErrorSSE("Unauthorized access. Please reload the page."));
    }
  }

  const liveShop = resolveShop(shopParam);
  const shopId = liveShop?.domain || "demo-store";
  const shopSettings = liveShop ? getSettings(shopId) : undefined;

  if (liveShop) {
    const usage = getUsageSummary(shopId);
    if (usage.freeRemaining <= 0) {
      return sseResponse(buildUsageLimitSSE());
    }
  }

  // Demo mode: no valid API key or no connected shop
  if (!isLlmKeyValid()) {
    const steps = buildMockSteps(messages);
    return sseResponse(buildMockSSE(steps));
  }

  const { streamText, tool, stepCountIs } = await import("ai");
  const { z } = await import("zod");
  const { apiKey, baseURL, model: modelName } = getLlmConfig();

  // Support OpenAI-compatible gateways (e.g. OpenRouter/Arouter) via LLM_BASE_URL + LLM_API_KEY.
  // Keep backward-compat with OPENAI_API_KEY when LLM_API_KEY is not set.
  const provider = async () => {
    const mod = await import("@ai-sdk/openai");
    const m = mod as unknown as {
      createOpenAI?: (opts: { apiKey?: string; baseURL?: string }) => (model: string) => unknown;
      openai: (model: string) => unknown;
    };
    if (typeof m.createOpenAI === "function") {
      return m.createOpenAI({ apiKey, baseURL });
    }
    return m.openai;
  };

  // Cache fetched orders for the session so track_shipment can reference them
  let cachedOrders: OrderForDisplay[] = [];

  const result = streamText({
    // @ts-expect-error provider returns a model factory compatible with streamText
    model: (await provider())(modelName),
    system: buildSystemPrompt(liveShop ? customerEmail : undefined, shopSettings),
    messages,
    stopWhen: stepCountIs(5),
    tools: {
      lookup_orders: tool({
        description: "Look up customer's recent orders by email.",
        parameters: z.object({
          email: z.string().describe("Customer email"),
        }),
        // @ts-expect-error AI SDK v6 + zod type mismatch
        execute: async (args: { email: string }) => {
          if (liveShop) {
            try {
              const orders = await liveShop.client.getOrdersByEmail(args.email);
              cachedOrders = orders;
              return { orders, source: "shopify" };
            } catch (err) {
              captureException(err, { shop: shopId, route: "lookup_orders" });
              const msg = typeof err === "object" && err !== null && "message" in err
                ? (err as { message: string }).message
                : "Unable to look up orders right now. Please try again later.";
              return { orders: [], source: "error", error: msg };
            }
          }
          cachedOrders = DEMO_ORDERS;
          return { orders: DEMO_ORDERS, source: "demo" };
        },
      }),

      initiate_return: tool({
        description: "Create a return or exchange request for an item.",
        parameters: z.object({
          orderId: z.number(),
          orderName: z.string(),
          itemId: z.number(),
          itemTitle: z.string(),
          reason: z.enum(["wrong_size", "damaged", "wrong_item", "changed_mind", "other"]),
          action: z.enum(["return", "exchange"]),
          exchangeDetails: z.string().optional().describe("For exchanges: new size/color"),
        }),
        // @ts-expect-error AI SDK v6 + zod type mismatch
        execute: async (args: { orderId: number; orderName: string; itemId: number; itemTitle: string; reason: string; action: string; exchangeDetails?: string }) => {
          trackTicket(shopId);
          const ticketType = args.action === "exchange" ? "exchange" as const : "return" as const;
          if (liveShop) {
            try {
              const result = await liveShop.client.createReturn(args.orderId, args.itemId, args.reason, args.exchangeDetails);
              const retId = `RET-${Date.now().toString(36).toUpperCase()}`;
              saveTicket({ id: retId, shop: shopId, customerEmail: customerEmail || "unknown", orderName: args.orderName, type: ticketType, status: result.success ? "resolved" : "pending", summary: `${args.action}: ${args.itemTitle} — ${args.reason}`, createdAt: new Date().toISOString() });
              logEvent({ name: "ticket_created", shop: shopId, props: { type: ticketType, status: result.success ? "resolved" : "pending", source: "shopify" } });
              if (result.success && shopSettings?.notifyOnReturn && shopSettings.notifyEmail) {
                notifyMerchantReturn({ shopDomain: shopId, notifyEmail: shopSettings.notifyEmail, customerEmail: customerEmail || "unknown", orderName: args.orderName, itemTitle: args.itemTitle, action: ticketType, reason: args.reason, exchangeDetails: args.exchangeDetails, returnId: retId }).catch(() => {});
              }
              return {
                ...result,
                orderName: args.orderName,
                itemTitle: args.itemTitle,
                action: args.action,
                reason: args.reason,
                exchangeDetails: args.exchangeDetails,
                instructions: result.success ? {
                  step1: "Pack the item in its original packaging",
                  step2: "Print the return label (sent to your email)",
                  step3: "Drop off at the nearest carrier location",
                  deadline: "Please ship within 14 days",
                } : undefined,
              };
            } catch (err) {
              captureException(err, { shop: shopId, route: "initiate_return" });
              const msg = typeof err === "object" && err !== null && "message" in err
                ? (err as { message: string }).message
                : "Unable to process the return right now. Please try again later.";
              return { success: false, message: msg, orderName: args.orderName, itemTitle: args.itemTitle };
            }
          }
          const returnId = `RET-${Date.now().toString(36).toUpperCase()}`;
          saveTicket({ id: returnId, shop: shopId, customerEmail: "demo@example.com", orderName: args.orderName, type: ticketType, status: "resolved", summary: `${args.action}: ${args.itemTitle} — ${args.reason}`, createdAt: new Date().toISOString() });
          logEvent({ name: "ticket_created", shop: shopId, props: { type: ticketType, status: "resolved", source: "demo" } });
          return {
            success: true,
            returnId,
            orderName: args.orderName,
            itemTitle: args.itemTitle,
            action: args.action,
            reason: args.reason,
            exchangeDetails: args.exchangeDetails,
            instructions: {
              step1: "Pack the item in its original packaging",
              step2: "Print the return label (sent to your email)",
              step3: "Drop off at any UPS location",
              deadline: "Please ship within 14 days",
            },
            labelUrl: `https://example.com/label/${returnId}`,
          };
        },
      }),

      track_shipment: tool({
        description: "Get tracking info for an order.",
        parameters: z.object({
          orderId: z.number(),
          orderName: z.string(),
        }),
        // @ts-expect-error AI SDK v6 + zod type mismatch
        execute: async (args: { orderId: number; orderName: string }) => {
          if (liveShop) {
            try {
              const order = cachedOrders.find((o) => o.id === args.orderId)
                || await liveShop.client.getOrderById(args.orderId);
              if (!order) return { error: "Order not found", orderName: args.orderName };
              if (!order.tracking) return { orderName: args.orderName, status: "not_shipped", message: "Not yet shipped." };
              return { orderName: args.orderName, ...order.tracking };
            } catch (err) {
              captureException(err, { shop: shopId, route: "track_shipment" });
              const msg = typeof err === "object" && err !== null && "message" in err
                ? (err as { message: string }).message
                : "Unable to fetch tracking info right now.";
              return { error: msg, orderName: args.orderName };
            }
          }
          const order = DEMO_ORDERS.find((o) => o.id === args.orderId);
          if (!order) return { error: "Order not found", orderName: args.orderName };
          if (!order.tracking) return { orderName: args.orderName, status: "not_shipped", message: "Not yet shipped." };
          return { orderName: args.orderName, ...order.tracking };
        },
      }),

      escalate_to_human: tool({
        description: "Escalate the conversation to a human agent when AI cannot resolve the issue.",
        parameters: z.object({
          reason: z.string().describe("Why escalation is needed"),
          summary: z.string().describe("Summary of the conversation and what the customer needs"),
        }),
        // @ts-expect-error AI SDK v6 + zod type mismatch
        execute: async (args: { reason: string; summary: string }) => {
          const ticketId = `ESC-${Date.now().toString(36).toUpperCase()}`;
          saveTicket({
            id: ticketId,
            shop: shopId,
            customerEmail: customerEmail || "unknown",
            orderName: "",
            type: "inquiry",
            status: "pending",
            summary: `Escalated: ${args.summary}`,
            createdAt: new Date().toISOString(),
          });
          logEvent({ name: "ticket_created", shop: shopId, props: { type: "inquiry", status: "pending", source: liveShop ? "shopify" : "demo", escalated: true } });
          if (shopSettings?.notifyOnReturn && shopSettings.notifyEmail) {
            notifyMerchantEscalation({ shopDomain: shopId, notifyEmail: shopSettings.notifyEmail, ticketId, reason: args.reason, summary: args.summary, customerEmail: customerEmail || "unknown" }).catch(() => {});
          }
          return {
            success: true,
            ticketId,
            reason: args.reason,
            summary: args.summary,
            message: "Your request has been escalated to our support team. A human agent will review your case and get back to you shortly.",
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
