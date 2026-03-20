import { NextRequest, NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { createProSubscription } from "@/lib/billing/shopify-billing";

export async function POST(req: NextRequest) {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = (process.env.APP_URL || req.nextUrl.origin).replace(/\/+$/, "");
  const returnUrl = `${origin}/admin?billing=1`;

  try {
    const { confirmationUrl } = await createProSubscription(shop, returnUrl);
    return NextResponse.json({ ok: true, confirmationUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create subscription";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

