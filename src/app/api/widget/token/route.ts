import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { generateWidgetToken, isValidShopDomain } from "@/lib/crypto";

export async function GET(req: Request) {
  const sessionShop = await getSessionShop();
  if (!sessionShop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const shopParam = searchParams.get("shop");

  const shop = shopParam || sessionShop;
  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Invalid shop" }, { status: 400 });
  }

  if (shop !== sessionShop) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = generateWidgetToken(shop);
  return NextResponse.json({ shop, token });
}

