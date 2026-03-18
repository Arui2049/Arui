import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";

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

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
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

    const shop = typeof body.shop === "string" && body.shop.length <= 120 ? body.shop : undefined;
    const anonId = typeof body.anonId === "string" && body.anonId.length <= 120 ? body.anonId : undefined;
    const path = typeof body.path === "string" && body.path.length <= 300 ? body.path : undefined;
    const attrib = body.attrib && typeof body.attrib === "object" ? body.attrib : undefined;
    const props = body.props && typeof body.props === "object" ? body.props : undefined;

    const saved = logEvent({ name, shop, anonId, path, attrib, props });
    return NextResponse.json({ ok: true, id: saved.id }, { headers: corsHeaders() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: corsHeaders() });
  }
}

