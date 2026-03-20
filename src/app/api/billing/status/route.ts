import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { billingStale, getBillingCached, syncBillingFromShopify } from "@/lib/billing/shopify-billing";

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cached = getBillingCached(shop);
  const state = billingStale(cached, 30 * 60 * 1000) ? await syncBillingFromShopify(shop) : cached!;
  return NextResponse.json({ shop, billing: state });
}

