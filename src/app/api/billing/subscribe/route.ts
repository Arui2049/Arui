import { NextRequest, NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { createSubscription } from "@/lib/billing/shopify-billing";
import { PLAN_KEYS } from "@/lib/billing/plans";

export async function POST(req: NextRequest) {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { plan?: string };
  const planKey = body.plan || "starter";

  if (!PLAN_KEYS.includes(planKey as typeof PLAN_KEYS[number]) || planKey === "free") {
    return NextResponse.json({ ok: false, error: `Invalid plan: ${planKey}` }, { status: 400 });
  }

  const origin = (process.env.APP_URL || req.nextUrl.origin).replace(/\/+$/, "");
  const returnUrl = `${origin}/admin?billing=1`;

  try {
    const { confirmationUrl } = await createSubscription(shop, planKey, returnUrl);
    return NextResponse.json({ ok: true, confirmationUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create subscription";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
