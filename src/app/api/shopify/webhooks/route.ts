import { NextResponse } from "next/server";
import { verifyShopifyWebhookHmac } from "@/lib/crypto";
import {
  removeAllShopData,
  getTicketsByCustomerEmail,
  removeTicketsByCustomerEmail,
  recordGdprRequest,
} from "@/lib/store";

function extractCustomerEmail(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "customer" in payload &&
    payload.customer &&
    typeof payload.customer === "object" &&
    "email" in payload.customer
  ) {
    return String((payload.customer as { email?: unknown }).email || "");
  }
  return "";
}

function extractDataRequestId(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "data_request" in payload &&
    payload.data_request &&
    typeof payload.data_request === "object" &&
    "id" in payload.data_request
  ) {
    return String((payload.data_request as { id?: unknown }).id);
  }
  return undefined;
}

export async function POST(req: Request) {
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");
  const shopDomain = req.headers.get("x-shopify-shop-domain");

  if (!hmacHeader || !topic || !shopDomain) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  const body = await req.text();

  if (!verifyShopifyWebhookHmac(body, hmacHeader)) {
    return NextResponse.json({ error: "HMAC verification failed" }, { status: 401 });
  }

  let payload: unknown = undefined;
  if (topic.startsWith("customers/") || topic === "shop/redact") {
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  }

  switch (topic) {
    case "app/uninstalled": {
      // Treat uninstall as immediate full deletion of local data to reduce compliance risk.
      // Shopify may also send shop/redact separately; this is idempotent on our side.
      removeAllShopData(shopDomain);
      recordGdprRequest({
        topic,
        shop: shopDomain,
        status: "processed",
        details: "App uninstalled — all local shop data removed.",
      });
      return NextResponse.json({ ok: true });
    }

    case "customers/data_request": {
      const email = extractCustomerEmail(payload);
      const dataRequestId = extractDataRequestId(payload);

      if (email) {
        const tickets = getTicketsByCustomerEmail(shopDomain, email);
        const exportedData = {
          dataRequestId,
          customer: { email },
          tickets: tickets.map((t) => ({
            id: t.id,
            orderName: t.orderName,
            type: t.type,
            status: t.status,
            summary: t.summary,
            createdAt: t.createdAt,
          })),
          exportedAt: new Date().toISOString(),
        };
        recordGdprRequest({
          topic,
          shop: shopDomain,
          customerEmail: email,
          status: "processed",
          details: `Exported ${tickets.length} ticket(s) for requested customer.`,
          exportedData,
        });
        console.log(
          `[GDPR] customers/data_request shop=${shopDomain} email=${email} tickets=${tickets.length}`,
        );
      } else {
        recordGdprRequest({
          topic,
          shop: shopDomain,
          status: "needs_manual_review",
          details: "Missing customer email in payload; manual lookup required.",
        });
      }
      return NextResponse.json({ ok: true });
    }

    case "customers/redact": {
      const email = extractCustomerEmail(payload);

      if (email) {
        removeTicketsByCustomerEmail(shopDomain, email);
        recordGdprRequest({
          topic,
          shop: shopDomain,
          customerEmail: email,
          status: "processed",
          details: "Customer ticket records removed by email match.",
        });
        console.log(`[GDPR] customers/redact shop=${shopDomain} email=${email}`);
      } else {
        recordGdprRequest({
          topic,
          shop: shopDomain,
          status: "needs_manual_review",
          details: "Missing customer email in payload; no matching local PII key.",
        });
      }
      return NextResponse.json({ ok: true });
    }

    case "shop/redact": {
      removeAllShopData(shopDomain);
      recordGdprRequest({
        topic,
        shop: shopDomain,
        status: "processed",
        details: "All local shop data removed.",
      });
      console.log(`[GDPR] shop/redact shop=${shopDomain} — all data removed`);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: true, topic });
  }
}
