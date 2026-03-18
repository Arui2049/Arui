import { NextResponse, type NextRequest } from "next/server";

const SHOP_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  ref?: string;
  landing_path?: string;
  referer?: string;
  ts: string; // ISO timestamp
};

const ATTRIB_FT_COOKIE = "rb_attrib_ft";
const ATTRIB_LT_COOKIE = "rb_attrib_lt";
const ATTRIB_MAX_AGE_S = 60 * 60 * 24 * 90; // 90 days

function pickAttribution(req: NextRequest): Attribution | null {
  const url = req.nextUrl;
  const sp = url.searchParams;

  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid", "ttclid", "ref"] as const;
  const a: Partial<Attribution> = {};
  let has = false;
  for (const k of keys) {
    const v = sp.get(k);
    if (v && v.length <= 200) {
      (a as Record<string, string>)[k] = v;
      has = true;
    }
  }

  const referer = req.headers.get("referer") || "";
  const landing_path = `${url.pathname}${url.search ? url.search : ""}`;

  if (!has && !referer) return null;

  const out: Attribution = {
    ...(a as Attribution),
    landing_path,
    ...(referer ? { referer: referer.slice(0, 500) } : {}),
    ts: new Date().toISOString(),
  };
  return out;
}

function applyAttributionCookies(req: NextRequest, res: NextResponse, attrib: Attribution | null) {
  if (!attrib) return;

  // Keep cookies readable by client code (not httpOnly) so we can attach attribution to client-side events.
  const base = {
    sameSite: "lax" as const,
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: ATTRIB_MAX_AGE_S,
  };

  const payload = JSON.stringify(attrib);
  const hasFirstTouch = !!req.cookies.get(ATTRIB_FT_COOKIE)?.value;
  if (!hasFirstTouch) {
    res.cookies.set(ATTRIB_FT_COOKIE, payload, base);
  }
  res.cookies.set(ATTRIB_LT_COOKIE, payload, base);
}

async function hmacSHA256Edge(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySessionEdge(cookie: string): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const idx = cookie.lastIndexOf(":");
  if (idx < 1) return null;
  const shop = cookie.slice(0, idx);
  const sig = cookie.slice(idx + 1);
  const expected = await hmacSHA256Edge(shop, secret);
  if (expected !== sig) return null;
  if (!SHOP_RE.test(shop) || shop.length > 100) return null;
  return shop;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const attrib = pickAttribution(req);

  const protectedPaths = ["/admin", "/api/admin"];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) {
    const res = NextResponse.next();
    applyAttributionCookies(req, res, attrib);
    return res;
  }

  const sessionCookie = req.cookies.get("rb_session")?.value;
  if (!sessionCookie) {
    const r = redirectToConnect(req);
    applyAttributionCookies(req, r, attrib);
    return r;
  }

  const shop = await verifySessionEdge(sessionCookie);
  if (!shop) {
    const r = redirectToConnect(req);
    applyAttributionCookies(req, r, attrib);
    return r;
  }

  const res = NextResponse.next();
  res.headers.set("x-rb-shop", shop);
  applyAttributionCookies(req, res, attrib);
  return res;
}

function redirectToConnect(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/connect";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
