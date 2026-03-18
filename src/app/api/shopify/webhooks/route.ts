import { NextResponse } from "next/server";
import { verifyShopifyWebhookHmac } from "@/lib/crypto";
import { removeShop, removeUsage } from "@/lib/store";

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

  if (topic === "app/uninstalled") {
    removeShop(shopDomain);
    removeUsage(shopDomain);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, topic });
}
