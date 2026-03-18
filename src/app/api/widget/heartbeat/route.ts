import { NextResponse } from "next/server";
import { isValidShopDomain, verifyWidgetToken } from "@/lib/crypto";
import { recordWidgetHeartbeat } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const { shop, token } = await req.json();
    if (!shop || !isValidShopDomain(shop)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!token || !verifyWidgetToken(shop, token)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    recordWidgetHeartbeat(shop);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
