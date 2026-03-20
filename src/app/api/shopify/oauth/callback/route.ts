import { NextRequest, NextResponse } from "next/server";
import { saveShop } from "@/lib/store";
import { isValidShopDomain, verifyShopifyHmac, signSession } from "@/lib/crypto";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getShopifyApiVersion(): string {
  return process.env.SHOPIFY_API_VERSION || "2026-01";
}

function safeJsonCookie(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object") return v as Record<string, unknown>;
    return undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const appUrl = (process.env.APP_URL || url.origin).replace(/\/+$/, "");

  function redirectError(msg: string) {
    return NextResponse.redirect(`${appUrl}/connect?error=${encodeURIComponent(msg)}`);
  }

  const shop = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!shop || !code || !state) {
    return redirectError("Missing required parameters from Shopify.");
  }

  if (!isValidShopDomain(shop)) {
    return redirectError("Invalid shop domain.");
  }

  const savedState = req.cookies.get("rb_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return redirectError("State mismatch — please try connecting again.");
  }

  if (!verifyShopifyHmac(url.searchParams)) {
    return redirectError("HMAC verification failed — please try connecting again.");
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) {
    return redirectError("Shopify credentials (SHOPIFY_API_KEY / SHOPIFY_API_SECRET) are not configured on the server.");
  }

  try {
    const { default: https } = await import("https");

    const tokenData = await new Promise<{ access_token: string }>((resolve, reject) => {
      const postData = JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code });
      const reqOpts = {
        hostname: shop,
        path: "/admin/oauth/access_token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };
      const httpReq = https.request(reqOpts, (res) => {
        let body = "";
        res.on("data", (chunk: string) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Shopify returned ${res.statusCode}: ${body}`));
            return;
          }
          try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON from Shopify")); }
        });
      });
      httpReq.on("error", reject);
      httpReq.write(postData);
      httpReq.end();
    });

    const { access_token } = tokenData;
    saveShop({ shop, accessToken: access_token, installedAt: new Date().toISOString() });
    logEvent({
      name: "connect_success",
      shop,
      anonId: req.cookies.get("rb_anon")?.value,
      attrib: safeJsonCookie(req.cookies.get("rb_attrib_ft")?.value) || safeJsonCookie(req.cookies.get("rb_attrib_lt")?.value),
      props: { oauth: true },
    });

    // Register required webhooks (non-fatal)
    try {
      const registerWebhook = async (topic: string) => {
        const webhookData = JSON.stringify({
          webhook: {
            topic,
            address: `${appUrl}/api/shopify/webhooks`,
            format: "json",
          },
        });
        await new Promise<void>((resolve) => {
          const wreq = https.request({
            hostname: shop,
            path: `/admin/api/${getShopifyApiVersion()}/webhooks.json`,
            method: "POST",
            headers: {
              "X-Shopify-Access-Token": access_token,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(webhookData),
            },
          }, (res) => {
            let body = "";
            res.on("data", (chunk: string) => (body += chunk));
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 400) {
                console.error(`[Webhook] Failed to register "${topic}" for ${shop}: ${res.statusCode} ${body}`);
              }
              resolve();
            });
          });
          wreq.on("error", (err) => {
            console.error(`[Webhook] Network error registering "${topic}" for ${shop}:`, err.message);
            resolve();
          });
          wreq.write(webhookData);
          wreq.end();
        });
      };

      await registerWebhook("app/uninstalled");
      await registerWebhook("customers/data_request");
      await registerWebhook("customers/redact");
      await registerWebhook("shop/redact");
    } catch (err) {
      console.error("[Webhook] Unexpected error during webhook registration:", err);
    }

    const response = NextResponse.redirect(`${appUrl}/admin`);

    response.cookies.set("rb_session", signSession(shop), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.delete("rb_oauth_state");

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth token exchange failed";
    return redirectError(msg);
  }
}
