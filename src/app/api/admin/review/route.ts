import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { getUsageSummary } from "@/lib/billing/usage";
import { getResolvedRate } from "@/lib/store";
import { canPromptReview, getReviewState, recordReviewAction, type ReviewAction } from "@/lib/review-prompts";

function getReviewUrl() {
  // You can set this to your Shopify App Store listing reviews section.
  return process.env.APP_STORE_REVIEW_URL || process.env.NEXT_PUBLIC_APP_STORE_REVIEW_URL || "";
}

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = getUsageSummary(shop);
  const resolvedRate = getResolvedRate(shop);
  const state = getReviewState(shop);
  const reviewUrl = getReviewUrl();

  const meetsValue = usage.ticketCount >= 5 && resolvedRate >= 90;
  const eligible = !!reviewUrl && meetsValue && canPromptReview(state);

  return NextResponse.json({
    shop,
    eligible,
    reviewUrl,
    reason: !reviewUrl
      ? "missing_review_url"
      : !meetsValue
        ? "not_enough_value_yet"
        : canPromptReview(state)
          ? "ok"
          : "cooldown",
    state,
    metrics: { ticketCount: usage.ticketCount, resolvedRate },
  });
}

export async function POST(req: Request) {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { action?: ReviewAction };
  const action = body.action;
  if (action !== "shown" && action !== "clicked" && action !== "dismissed") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const state = recordReviewAction(shop, action);
  return NextResponse.json({ ok: true, state });
}

