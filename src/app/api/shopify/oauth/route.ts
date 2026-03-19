import { NextResponse } from "next/server";
import { isValidShopDomain, generateNonce } from "@/lib/crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const shop = searchParams.get("shop");
  const appUrl = (process.env.APP_URL || url.origin).replace(/\/+$/, "");

  function redirectError(msg: string) {
    return NextResponse.redirect(`${appUrl}/connect?error=${encodeURIComponent(msg)}`);
  }

  if (!shop) {
    return redirectError("Missing shop parameter.");
  }

  if (!isValidShopDomain(shop)) {
    return redirectError("Invalid shop domain. Must be xxx.myshopify.com");
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!apiKey) {
    return redirectError("SHOPIFY_API_KEY is not configured on the server.");
  }

  const scopes = process.env.SHOPIFY_SCOPES || "read_orders,write_returns";
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
