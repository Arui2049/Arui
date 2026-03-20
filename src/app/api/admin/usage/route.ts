import { NextResponse } from "next/server";
import { getUsageSummary } from "@/lib/billing/usage";
import { getSessionShop } from "@/lib/session";
import { getTickets, getTicketsByDay, getTicketTypeBreakdown, getResolvedRate, getWidgetHeartbeat } from "@/lib/store";
import { billingStale, getBillingCached, isPaidActive, syncBillingFromShopify } from "@/lib/billing/shopify-billing";

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const usage = getUsageSummary(shop);
  const tickets = getTickets(shop);
  const hasTestTicket = usage.ticketCount > 0 || tickets.length > 0;
  const dailyCounts = getTicketsByDay(shop, 14);
  const typeBreakdown = getTicketTypeBreakdown(shop);
  const resolvedRate = getResolvedRate(shop);
  const lastWidgetPing = getWidgetHeartbeat(shop);
  const widgetInstalled = lastWidgetPing ? (Date.now() - new Date(lastWidgetPing).getTime()) < 86_400_000 : false;

  const cachedBilling = getBillingCached(shop);
  const billing = billingStale(cachedBilling, 30 * 60 * 1000) ? await syncBillingFromShopify(shop) : cachedBilling;

  const apiKey = process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "";
  const handle = "auri-embed";
  const themeEditorUrl = apiKey
    ? `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${encodeURIComponent(apiKey)}/${encodeURIComponent(handle)}`
    : `https://${shop}/admin/themes/current/editor?context=apps`;

  return NextResponse.json({
    ...usage,
    hasTestTicket,
    widgetInstalled,
    dailyCounts,
    typeBreakdown,
    resolvedRate,
    billing,
    paidActive: isPaidActive(billing || null),
    themeEditorUrl,
  });
}
