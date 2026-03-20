import { trackTicket, getUsageSummary } from "@/lib/billing/usage";
import { getShop, saveTicket, getSettings, type ShopSettings, getBilling } from "@/lib/store";
import { billingStale, syncBillingFromShopify } from "@/lib/billing/shopify-billing";
import { logEvent } from "@/lib/events";
import { ShopifyClient } from "@/lib/shopify/client";
import { isValidShopDomain, verifyWidgetToken } from "@/lib/crypto";
import { captureException } from "@/lib/errors";
import { notifyMerchantReturn, notifyMerchantEscalation } from "@/lib/notify";
import type { OrderForDisplay } from "@/lib/shopify/types";

export const maxDuration = 30;

// --- In-memory rate limiter (sliding window) ---

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function rateKey(req: Request, shop?: string): string {
  const ip = getClientIp(req);
  return shop ? `${shop}|${ip}` : ip;
}

function checkRateLimit(req: Request, shop?: string): boolean {
  const key = rateKey(req, shop);
  const now = Date.now();
  let timestamps = rateBuckets.get(key);
  if (!timestamps) {
    timestamps = [];
    rateBuckets.set(key, timestamps);
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
- For exchanges, proactively help the customer choose the right replacement (size/color) before calling initiate_return:
  - If the issue is size/fit: ask if it runs small or large; suggest one size up/down and ask for confirmation (e.g., "Size 10").
  - If the issue is color/style: ask their preferred color/style and confirm the exact replacement.
  - If the customer is unsure: offer a return instead and explain next steps briefly.
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
    (m) => m.role === "assistant" && m.parts?.some((p) => {
      const pr = p as Record<string, unknown>;
      // AI SDK v6: type is "tool-lookup_orders", toolName may or may not exist
      if (pr.toolName === name) return true;
      if (typeof pr.type === "string" && pr.type === `tool-${name}`) return true;
      return false;
    }),
  );
}

interface MockStep {
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: Record<string, unknown>;
  text?: string;
}

/**
 * Look through previous user messages (excluding the latest) to find an earlier
 * return/exchange intent, so we know we're now in the "provide details" step.
 */
function findPriorReturnIntent(messages: ChatMessage[]): {
  matchedOrder: OrderForDisplay;
  matchedItem: OrderForDisplay["items"][0];
  isExchange: boolean;
} | null {
  for (let i = messages.length - 2; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    const parts = msg.parts;
    let text = "";
    if (parts) {
      const tp = parts.find((p) => p.type === "text" && p.text);
      if (tp) text = tp.text!;
    } else if (msg.content) {
      text = msg.content;
    }
    if (!text) continue;
    const t = text.toLowerCase();

    const isReturn = t.includes("i want to return") || t.includes("退");
    const isExchange = t.includes("i want to exchange") || t.includes("换");
    if (!isReturn && !isExchange) continue;

    const matched = matchItemFromInput(t);
    return { ...matched, isExchange };
  }
  return null;
}

function extractReturnReason(input: string): { key: string; label: string } {
  if (input.includes("defective") || input.includes("damaged") || input.includes("broken") || input.includes("坏") || input.includes("质量"))
    return { key: "defective", label: "Defective or damaged" };
  if (input.includes("wrong item") || input.includes("wrong product") || input.includes("not what") || input.includes("错"))
    return { key: "wrong_item", label: "Received wrong item" };
  if (input.includes("fit") || input.includes("small") || input.includes("big") || input.includes("large") || input.includes("tight") || input.includes("loose") || input.includes("尺码") || input.includes("大了") || input.includes("小了"))
    return { key: "wrong_size", label: "Doesn't fit" };
  if (input.includes("not as described") || input.includes("不符") || input.includes("描述"))
    return { key: "not_as_described", label: "Not as described" };
  return { key: "changed_mind", label: "Changed mind" };
}

function extractExchangeDetails(input: string): string {
  const parts: string[] = [];
  const sizeMatch = input.match(/size\s*(\d+|xs|s|m|l|xl|xxl)/i);
  if (sizeMatch) parts.push(`Size ${sizeMatch[1].toUpperCase()}`);

  const colorWords = ["black", "white", "red", "blue", "green", "navy", "gray", "grey", "brown", "pink", "beige", "cream"];
  for (const c of colorWords) {
    if (input.includes(c)) { parts.push(c.charAt(0).toUpperCase() + c.slice(1)); break; }
  }

  if (parts.length > 0) return parts.join(", ");
  const trimmed = input.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function matchItemFromInput(input: string): { matchedOrder: OrderForDisplay; matchedItem: OrderForDisplay["items"][0] } {
  // Priority 1: match by specific item title
  for (const order of DEMO_ORDERS) {
    for (const item of order.items) {
      if (input.includes(item.title.toLowerCase())) {
        return { matchedOrder: order, matchedItem: item };
      }
    }
  }
  // Priority 2: match by order name — return first item in that order
  for (const order of DEMO_ORDERS) {
    if (input.includes(order.name.toLowerCase())) {
      return { matchedOrder: order, matchedItem: order.items[0] };
    }
  }
  return { matchedOrder: DEMO_ORDERS[0], matchedItem: DEMO_ORDERS[0].items[0] };
}

function buildMockSteps(messages: ChatMessage[]): MockStep[] {
  const input = getLastUserText(messages);
  const hasOrders = hasPriorToolCall(messages, "lookup_orders");
  const hasReturn = hasPriorToolCall(messages, "initiate_return");

  // ── Step 1: Order lookup ──
  if (!hasOrders && (input.includes("order") || input.includes("return") || input.includes("track") || input.includes("package") || input.includes("查") || input.includes("退") || input.includes("换") || input.includes("物流"))) {
    return [
      {
        toolName: "lookup_orders",
        toolArgs: { email: "demo@example.com" },
        toolResult: { orders: DEMO_ORDERS, source: "demo" },
      },
      { text: "I found 3 orders on your account. Which item would you like to return or exchange?" },
    ];
  }

  // ── Step 2: Tracking ──
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

  // ── Step 3: Return / Exchange — multi-turn flow ──
  if (hasOrders && !hasReturn) {
    const priorIntent = findPriorReturnIntent(messages);

    if (!priorIntent) {
      // 3a: User just selected an item (clicked button or typed) → ask for details
      const isReturnRelated = input.includes("return") || input.includes("退") || input.includes("exchange") || input.includes("换") ||
        DEMO_ORDERS.some(o => o.items.some(it => input.includes(it.title.toLowerCase())) || input.includes(o.name.toLowerCase()));

      if (isReturnRelated) {
        const { matchedItem } = matchItemFromInput(input);
        const isExchange = input.includes("exchange") || input.includes("换") || input.includes("different size") || input.includes("different color") || input.includes("swap");

        if (isExchange) {
          return [{ text: `Sure, I'd love to help you exchange the ${matchedItem.title}! What would you like instead?\n\n• A different size (e.g. Size 8, 10, 11)\n• A different color\n\nJust let me know what you'd prefer.` }];
        }
        return [{ text: `Sure, I can help you return the ${matchedItem.title}. Could you let me know the reason?\n\n• Changed my mind\n• Doesn't fit / Wrong size\n• Item is defective or damaged\n• Received the wrong item` }];
      }
    }

    if (priorIntent) {
      // 3b: User provided details (reason for return, or specs for exchange) → process
      const { matchedOrder, matchedItem, isExchange } = priorIntent;
      const returnId = `RET-${Date.now().toString(36).toUpperCase()}`;
      trackTicket("demo-store");

      if (isExchange) {
        const exchangeDetails = extractExchangeDetails(input);
        const action = "exchange" as const;
        saveTicket({ id: returnId, shop: "demo-store", customerEmail: "demo@example.com", orderName: matchedOrder.name, type: action, status: "resolved", summary: `Exchange: ${matchedItem.title} → ${exchangeDetails}`, createdAt: new Date().toISOString() });
        logEvent({ name: "ticket_created", shop: "demo-store", props: { type: action, status: "resolved", source: "demo" } });

        return [
          {
            toolName: "initiate_return",
            toolArgs: { orderId: matchedOrder.id, orderName: matchedOrder.name, itemId: matchedItem.id, itemTitle: matchedItem.title, reason: "wrong_size", action, exchangeDetails },
            toolResult: {
              success: true,
              returnId,
              orderName: matchedOrder.name,
              itemTitle: matchedItem.title,
              action,
              reason: "wrong_size",
              exchangeDetails,
              instructions: {
                step1: "Pack the original item in its packaging",
                step2: "Print the prepaid return label (sent to your email)",
                step3: `Drop off at any UPS location — your ${exchangeDetails} replacement ships as soon as we receive this one`,
                deadline: "Please ship within 14 days",
              },
              labelUrl: `https://example.com/label/${returnId}`,
            },
          },
          { text: `Great choice! Your exchange has been created — we'll send the ${exchangeDetails} replacement for your ${matchedItem.title} as soon as we receive the original. Just pack it up and drop it at any UPS location within 14 days.` },
        ];
      }

      const { key: reasonKey, label: reasonLabel } = extractReturnReason(input);
      const action = "return" as const;
      saveTicket({ id: returnId, shop: "demo-store", customerEmail: "demo@example.com", orderName: matchedOrder.name, type: action, status: "resolved", summary: `Return: ${matchedItem.title} — ${reasonLabel}`, createdAt: new Date().toISOString() });
      logEvent({ name: "ticket_created", shop: "demo-store", props: { type: action, status: "resolved", source: "demo" } });

      return [
        {
          toolName: "initiate_return",
          toolArgs: { orderId: matchedOrder.id, orderName: matchedOrder.name, itemId: matchedItem.id, itemTitle: matchedItem.title, reason: reasonKey, action },
          toolResult: {
            success: true,
            returnId,
            orderName: matchedOrder.name,
            itemTitle: matchedItem.title,
            action,
            reason: reasonKey,
            instructions: {
              step1: "Pack the item in its original packaging",
              step2: "Print the prepaid return label (sent to your email)",
              step3: "Drop off at any UPS location",
              deadline: "Please ship within 14 days — refund processed within 5 business days of receipt",
            },
            labelUrl: `https://example.com/label/${returnId}`,
          },
        },
        { text: `Your return for ${matchedItem.title} has been created (reason: ${reasonLabel}). Pack it up and drop it at any UPS location within 14 days — your refund will be processed within 5 business days after we receive the item.` },
      ];
    }
  }

  // ── Step 4: Post-return follow-up ──
  if (hasReturn) {
    return [{ text: "Your request has been processed! Is there anything else I can help you with?" }];
  }

  return [
    { text: "I can help you check your orders, track a shipment, or process a return. Just let me know what you need!" },
  ];
}

function buildMockSSE(steps: MockStep[]): string {
  const lines: string[] = [];
  const msgId = `mock-${Date.now()}`;
  let idSeq = 0;
  const nextId = (prefix: string) => `${prefix}-${msgId}-${idSeq++}`;

  lines.push(`data: ${JSON.stringify({ type: "start", messageId: msgId })}\n`);

  const toolSteps = steps.filter(s => s.toolName && s.toolResult);
  const textSteps = steps.filter(s => s.text);

  if (toolSteps.length > 0) {
    lines.push(`data: ${JSON.stringify({ type: "start-step" })}\n`);
    for (const step of toolSteps) {
      const callId = nextId("call");
      lines.push(`data: ${JSON.stringify({ type: "tool-input-start", toolCallId: callId, toolName: step.toolName })}\n`);
      // Emit deltas so the UI message stream parser builds a proper tool-call UI part.
      const inputJson = JSON.stringify(step.toolArgs || {});
      lines.push(`data: ${JSON.stringify({ type: "tool-input-delta", toolCallId: callId, inputTextDelta: "" })}\n`);
      lines.push(`data: ${JSON.stringify({ type: "tool-input-delta", toolCallId: callId, inputTextDelta: inputJson })}\n`);
      lines.push(`data: ${JSON.stringify({ type: "tool-input-available", toolCallId: callId, toolName: step.toolName, input: step.toolArgs || {} })}\n`);
      lines.push(`data: ${JSON.stringify({ type: "tool-output-available", toolCallId: callId, output: step.toolResult })}\n`);
    }
    lines.push(`data: ${JSON.stringify({ type: "finish-step" })}\n`);
  }

  if (textSteps.length > 0) {
    lines.push(`data: ${JSON.stringify({ type: "start-step" })}\n`);
    for (const step of textSteps) {
      const textId = nextId("txt");
      lines.push(`data: ${JSON.stringify({ type: "text-start", id: textId })}\n`);
      lines.push(`data: ${JSON.stringify({ type: "text-delta", id: textId, delta: step.text })}\n`);
      lines.push(`data: ${JSON.stringify({ type: "text-end", id: textId })}\n`);
    }
    lines.push(`data: ${JSON.stringify({ type: "finish-step" })}\n`);
  }

  lines.push(`data: ${JSON.stringify({ type: "finish" })}\n`);
  lines.push(`data: [DONE]\n`);

  return lines.join("\n");
}

function buildErrorSSE(message: string): string {
  const lines: string[] = [];
  const msgId = `err-${Date.now()}`;
  const textId = `txt-${msgId}`;
  lines.push(`data: ${JSON.stringify({ type: "start", messageId: msgId })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "start-step" })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "text-start", id: textId })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "text-delta", id: textId, delta: message })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "text-end", id: textId })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "finish-step" })}\n`);
  lines.push(`data: ${JSON.stringify({ type: "finish" })}\n`);
  lines.push(`data: [DONE]\n`);
  return lines.join("\n");
}

function buildUsageLimitSSE(): string {
  return buildErrorSSE("This store has reached its monthly free tier limit (50 tickets). Please contact the store owner to continue using chat support.");
}

function sseResponse(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
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
  const bodyText = await req.text();
  if (bodyText.length > 200_000) {
    return sseResponse(buildErrorSSE("Request is too large. Please reload the page and try again."));
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return sseResponse(buildErrorSSE("Invalid request payload."));
  }

  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const messages = obj.messages;
  const shopParam = obj.shop;
  const customerEmail = obj.customerEmail;
  const widgetToken = obj.widgetToken;

  const shopParamStr = typeof shopParam === "string" ? shopParam : undefined;
  const customerEmailStr = typeof customerEmail === "string" ? customerEmail : undefined;

  if (!checkRateLimit(req, shopParamStr)) {
    return sseResponse(buildErrorSSE("Too many requests. Please wait a moment and try again."));
  }

  type UiRole = "system" | "user" | "assistant";
  const isUiRole = (r: unknown): r is UiRole => r === "system" || r === "user" || r === "assistant";

  type UiMsg = Record<string, unknown> & {
    role: UiRole;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  };

  const msgsRaw = Array.isArray(messages) ? (messages as unknown[]) : [];
  const msgs: UiMsg[] = msgsRaw.filter((m): m is UiMsg => {
    if (!m || typeof m !== "object") return false;
    const r = (m as Record<string, unknown>).role;
    return isUiRole(r);
  });

  if (msgs.length > 40) {
    return sseResponse(buildErrorSSE("Conversation is too long. Please refresh and start a new chat."));
  }

  if (shopParamStr && shopParamStr !== "demo-store") {
    if (!isValidShopDomain(shopParamStr)) {
      return sseResponse(buildErrorSSE("Invalid store configuration."));
    }
    if (typeof widgetToken !== "string" || !verifyWidgetToken(shopParamStr, widgetToken)) {
      return sseResponse(buildErrorSSE("Unauthorized access. Please reload the page."));
    }
  }

  const liveShop = resolveShop(shopParamStr);
  const shopId = liveShop?.domain || "demo-store";
  const shopSettings = liveShop ? getSettings(shopId) : undefined;

  if (liveShop) {
    const usage = getUsageSummary(shopId);
    if (usage.freeRemaining <= 0) {
      const cached = getBilling(shopId);
      const b = billingStale(cached, 30 * 60 * 1000) ? await syncBillingFromShopify(shopId) : cached;
      const paid = !!b && (b.status === "active" || b.status === "trialing");
      if (!paid) {
        return sseResponse(buildUsageLimitSSE());
      }
    }
  }

  // Demo mode: no connected live shop, OR no valid LLM API key
  if (!liveShop || !isLlmKeyValid()) {
    const steps = buildMockSteps(msgs);
    return sseResponse(buildMockSSE(steps));
  }

  const { streamText, tool, stepCountIs, convertToModelMessages, jsonSchema } = await import("ai");
  const { apiKey, baseURL, model: modelName } = getLlmConfig();

  const provider = async () => {
    if (baseURL) {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      return createOpenAICompatible({
        name: "llm",
        baseURL,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    }
    const mod = await import("@ai-sdk/openai");
    const m = mod as unknown as {
      createOpenAI?: (opts: { apiKey?: string; baseURL?: string; compatibility?: string }) => (model: string) => unknown;
      openai: (model: string) => unknown;
    };
    if (typeof m.createOpenAI === "function") {
      return m.createOpenAI({ apiKey, compatibility: "compatible" });
    }
    return m.openai;
  };

  // Cache fetched orders for the session so track_shipment can reference them
  let cachedOrders: OrderForDisplay[] = [];

  type TextPart = { type: "text"; text: string };
  const msgsForModel = msgs.map((m) => {
    const parts: TextPart[] = [];
    if (Array.isArray(m.parts)) {
      for (const p of m.parts) {
        if (!p || typeof p !== "object") continue;
        const po = p as Record<string, unknown>;
        if (po.type === "text" && typeof po.text === "string" && po.text.length > 0) {
          parts.push({ type: "text", text: po.text });
        }
      }
    }
    if (parts.length === 0) {
      parts.push({ type: "text", text: String(m.content ?? "") });
    }
    return { role: m.role, parts };
  });

  const result = streamText({
    // @ts-expect-error provider returns a model factory compatible with streamText
    model: (await provider())(modelName),
    system: buildSystemPrompt(liveShop ? customerEmailStr : undefined, shopSettings),
    messages: await convertToModelMessages(msgsForModel),
    stopWhen: stepCountIs(5),
    tools: {
      lookup_orders: tool({
        description: "Look up customer's recent orders by email.",
        inputSchema: jsonSchema<{ email: string }>({
          type: "object" as const,
          properties: { email: { type: "string", description: "Customer email" } },
          required: ["email"],
        }),
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
        description: "Create a return or exchange request for an item. For exchanges, include exchangeDetails like \"Size 10\" or \"Color: Black, Size: L\" after confirming with the customer.",
        inputSchema: jsonSchema<{ orderId: number; orderName: string; itemId: number; itemTitle: string; reason: string; action: string; exchangeDetails?: string }>({
          type: "object" as const,
          properties: {
            orderId: { type: "number" },
            orderName: { type: "string" },
            itemId: { type: "number" },
            itemTitle: { type: "string" },
            reason: { type: "string", enum: ["wrong_size", "damaged", "wrong_item", "changed_mind", "other"] },
            action: { type: "string", enum: ["return", "exchange"] },
            exchangeDetails: { type: "string", description: "For exchanges: new size/color" },
          },
          required: ["orderId", "orderName", "itemId", "itemTitle", "reason", "action"],
        }),
        execute: async (args: { orderId: number; orderName: string; itemId: number; itemTitle: string; reason: string; action: string; exchangeDetails?: string }) => {
          trackTicket(shopId);
          const ticketType = args.action === "exchange" ? "exchange" as const : "return" as const;
          if (liveShop) {
            try {
              const result = await liveShop.client.createReturn(args.orderId, args.itemId, args.reason, args.exchangeDetails);
              const retId = `RET-${Date.now().toString(36).toUpperCase()}`;
              saveTicket({ id: retId, shop: shopId, customerEmail: customerEmailStr || "unknown", orderName: args.orderName, type: ticketType, status: result.success ? "resolved" : "pending", summary: `${args.action}: ${args.itemTitle} — ${args.reason}`, createdAt: new Date().toISOString() });
              logEvent({ name: "ticket_created", shop: shopId, props: { type: ticketType, status: result.success ? "resolved" : "pending", source: "shopify" } });
              if (result.success && shopSettings?.notifyOnReturn && shopSettings.notifyEmail) {
                notifyMerchantReturn({ shopDomain: shopId, notifyEmail: shopSettings.notifyEmail, customerEmail: customerEmailStr || "unknown", orderName: args.orderName, itemTitle: args.itemTitle, action: ticketType, reason: args.reason, exchangeDetails: args.exchangeDetails, returnId: retId }).catch(() => {});
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
        inputSchema: jsonSchema<{ orderId: number; orderName: string }>({
          type: "object" as const,
          properties: {
            orderId: { type: "number" },
            orderName: { type: "string" },
          },
          required: ["orderId", "orderName"],
        }),
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
        inputSchema: jsonSchema<{ reason: string; summary: string }>({
          type: "object" as const,
          properties: {
            reason: { type: "string", description: "Why escalation is needed" },
            summary: { type: "string", description: "Summary of the conversation and what the customer needs" },
          },
          required: ["reason", "summary"],
        }),
        execute: async (args: { reason: string; summary: string }) => {
          const ticketId = `ESC-${Date.now().toString(36).toUpperCase()}`;
          saveTicket({
            id: ticketId,
            shop: shopId,
            customerEmail: customerEmailStr || "unknown",
            orderName: "",
            type: "inquiry",
            status: "pending",
            summary: `Escalated: ${args.summary}`,
            createdAt: new Date().toISOString(),
          });
          logEvent({ name: "ticket_created", shop: shopId, props: { type: "inquiry", status: "pending", source: liveShop ? "shopify" : "demo", escalated: true } });
          if (shopSettings?.notifyOnReturn && shopSettings.notifyEmail) {
            notifyMerchantEscalation({ shopDomain: shopId, notifyEmail: shopSettings.notifyEmail, ticketId, reason: args.reason, summary: args.summary, customerEmail: customerEmailStr || "unknown" }).catch(() => {});
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
