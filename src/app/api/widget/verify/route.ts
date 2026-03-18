import { NextResponse } from "next/server";
import { isValidShopDomain, verifyWidgetToken } from "@/lib/crypto";
import { getShop, recordWidgetHeartbeat } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const token = searchParams.get("token");

  if (!shop || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Invalid shop" }, { status: 400 });
  }

  const record = getShop(shop);
  if (!record) {
    return NextResponse.json({ error: "Store not connected" }, { status: 404 });
  }

  if (!verifyWidgetToken(shop, token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  recordWidgetHeartbeat(shop);
  return NextResponse.json({ valid: true });
}
