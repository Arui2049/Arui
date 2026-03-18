import { captureException } from "./errors";

interface NotifyReturnParams {
  shopDomain: string;
  notifyEmail: string;
  customerEmail: string;
  orderName: string;
  itemTitle: string;
  action: "return" | "exchange";
  reason: string;
  exchangeDetails?: string;
  returnId: string;
}

export async function notifyMerchantReturn(params: NotifyReturnParams) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const actionLabel = params.action === "exchange" ? "Exchange" : "Return";
  const subject = `[Auri] New ${actionLabel}: ${params.orderName} — ${params.itemTitle}`;

  const body = [
    `A customer has submitted a ${params.action} request through Auri.`,
    "",
    `Store: ${params.shopDomain}`,
    `Order: ${params.orderName}`,
    `Item: ${params.itemTitle}`,
    `Action: ${actionLabel}`,
    `Reason: ${params.reason.replace(/_/g, " ")}`,
    params.exchangeDetails ? `Exchange details: ${params.exchangeDetails}` : "",
    `Customer email: ${params.customerEmail}`,
    `Ticket ID: ${params.returnId}`,
    "",
    "Log in to your Auri dashboard to manage this request.",
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Auri <notifications@imauri.com>",
        to: [params.notifyEmail],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      captureException(new Error(`Resend API error: ${res.status} ${errBody}`), { shop: params.shopDomain, route: "notify_return" });
    }
  } catch (err) {
    captureException(err, { shop: params.shopDomain, route: "notify_return" });
  }
}

interface NotifyEscalationParams {
  shopDomain: string;
  notifyEmail: string;
  ticketId: string;
  reason: string;
  summary: string;
  customerEmail: string;
}

export async function notifyMerchantEscalation(params: NotifyEscalationParams) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const subject = `[Auri] Escalation: ${params.ticketId} — needs human review`;

  const body = [
    "A conversation has been escalated to your team by Auri.",
    "",
    `Store: ${params.shopDomain}`,
    `Ticket: ${params.ticketId}`,
    `Customer: ${params.customerEmail}`,
    `Reason: ${params.reason}`,
    "",
    `Summary: ${params.summary}`,
    "",
    "Please review and respond to the customer.",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Auri <notifications@imauri.com>",
        to: [params.notifyEmail],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      captureException(new Error(`Resend API error: ${res.status} ${errBody}`), { shop: params.shopDomain, route: "notify_escalation" });
    }
  } catch (err) {
    captureException(err, { shop: params.shopDomain, route: "notify_escalation" });
  }
}
