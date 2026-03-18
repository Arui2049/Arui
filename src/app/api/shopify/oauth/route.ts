import { NextResponse } from "next/server";
import { isValidShopDomain, generateNonce } from "@/lib/crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Invalid shop domain. Must be xxx.myshopify.com" }, { status: 400 });
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SHOPIFY_API_KEY is not configured" }, { status: 500 });
  }

  const scopes = process.env.SHOPIFY_SCOPES || "read_orders,write_returns";
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirect = `${appUrl}/api/shopify/oauth/callback`;
  const nonce = generateNonce();

  const response = NextResponse.redirect(
    `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirect)}&state=${nonce}`,
  );

  response.cookies.set("rb_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/shopify/oauth/callback",
    maxAge: 600,
  });

  return response;
}
