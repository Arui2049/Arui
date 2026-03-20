import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";
import { isValidShopDomain } from "@/lib/crypto";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// --- Lightweight abuse protection (in-memory, per-IP) ---
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60; // 60 events per minute per IP
const rateBuckets = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(req: Request): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  let timestamps = rateBuckets.get(ip);
  if (!timestamps) {
    timestamps = [];
    rateBuckets.set(ip, timestamps);
  }
  while (timestamps.length > 0 && timestamps[0] < now - RATE_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_MAX) return false;
  timestamps.push(now);
  return true;
}

// Periodic cleanup to prevent memory leak
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { _rbEventsRateCleanup?: boolean };
  if (!g._rbEventsRateCleanup) {
    g._rbEventsRateCleanup = true;
    setInterval(() => {
      const cutoff = Date.now() - RATE_WINDOW_MS * 2;
      for (const [ip, ts] of rateBuckets) {
        if (ts.length === 0 || ts[ts.length - 1] < cutoff) rateBuckets.delete(ip);
      }
    }, 300_000);
  }
}

const MAX_BODY_BYTES = 10_000;
const MAX_JSON_BYTES = 4000; // attrib/props shallow size cap

export async function POST(req: Request) {
  if (!checkRateLimit(req)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": "60" } },
    );
  }
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: corsHeaders() },
      );
    }

    const body = JSON.parse(raw) as {
      name?: string;
      shop?: string;
      anonId?: string;
      path?: string;
      attrib?: Record<string, unknown>;
      props?: Record<string, unknown>;
    };

    const name = typeof body.name === "string" ? body.name.slice(0, 80) : "";
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400, headers: corsHeaders() });
    }

    const shopRaw = typeof body.shop === "string" ? body.shop : "";
    const shop = shopRaw && isValidShopDomain(shopRaw) ? shopRaw : undefined;
    const anonId = typeof body.anonId === "string" && body.anonId.length <= 120 ? body.anonId : undefined;
    const path = typeof body.path === "string" && body.path.length <= 300 ? body.path : undefined;
    const attrib = body.attrib && typeof body.attrib === "object" ? body.attrib : undefined;
    const props = body.props && typeof body.props === "object" ? body.props : undefined;

    if (attrib && JSON.stringify(attrib).length > MAX_JSON_BYTES) {
      return NextResponse.json({ error: "attrib too large" }, { status: 400, headers: corsHeaders() });
    }
    if (props && JSON.stringify(props).length > MAX_JSON_BYTES) {
      return NextResponse.json({ error: "props too large" }, { status: 400, headers: corsHeaders() });
    }

    const saved = logEvent({ name, shop, anonId, path, attrib, props });
    return NextResponse.json({ ok: true, id: saved.id }, { headers: corsHeaders() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: corsHeaders() });
  }
}

