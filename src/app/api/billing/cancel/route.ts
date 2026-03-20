import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { cancelSubscription } from "@/lib/billing/shopify-billing";

export async function POST(req: Request) {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { prorate?: boolean };
  const prorate = body.prorate === true;

  try {
    const billing = await cancelSubscription(shop, prorate);
    return NextResponse.json({ ok: true, billing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to cancel subscription";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

