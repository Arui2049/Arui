import { getUsage, incrementUsage, getBilling } from "../store";
import { getEffectivePlan, reportUsageRecord } from "./shopify-billing";
import type { PricingPlan } from "./plans";

export interface UsageSummary {
  shop: string;
  month: string;
  ticketCount: number;
  includedTickets: number;
  freeRemaining: number;
  overageCount: number;
  overageCostDisplay: string;
  cappedAmountUsd: number;
  planKey: string;
  planName: string;
}

function build(shop: string, month: string, count: number, plan: PricingPlan): UsageSummary {
  const overageCount = Math.max(0, count - plan.includedTickets);
  const overageCostCents = overageCount * plan.overagePriceCentsPerTicket;
  const capCents = plan.cappedAmountUsd * 100;
  const effectiveCostCents = capCents > 0 ? Math.min(overageCostCents, capCents) : overageCostCents;

  return {
    shop,
    month,
    ticketCount: count,
    includedTickets: plan.includedTickets,
    freeRemaining: Math.max(0, plan.includedTickets - count),
    overageCount,
    overageCostDisplay: `$${(effectiveCostCents / 100).toFixed(2)}`,
    cappedAmountUsd: plan.cappedAmountUsd,
    planKey: plan.key,
    planName: plan.name,
  };
}

export function trackTicket(shop: string, ticketId?: string) {
  const r = incrementUsage(shop);
  const billing = getBilling(shop);
  const plan = getEffectivePlan(billing);
  const summary = build(r.shop, r.month, r.ticketCount, plan);

  if (summary.overageCount > 0 && plan.overagePriceCentsPerTicket > 0 && ticketId) {
    reportUsageRecord(shop, ticketId, summary.overageCount).catch(() => {});
  }

  return summary;
}

export function getUsageSummary(shop: string) {
  const r = getUsage(shop);
  const billing = getBilling(shop);
  const plan = getEffectivePlan(billing);
  return build(r.shop, r.month, r.ticketCount, plan);
}

export function isWithinLimit(shop: string): boolean {
  const r = getUsage(shop);
  const billing = getBilling(shop);
  const plan = getEffectivePlan(billing);

  if (plan.key === "free") {
    return r.ticketCount < plan.includedTickets;
  }

  if (plan.overagePriceCentsPerTicket <= 0) {
    return r.ticketCount < plan.includedTickets;
  }

  // Plans with overage: allow tickets until cap reached
  const overageCount = Math.max(0, r.ticketCount - plan.includedTickets);
  const overageCostCents = overageCount * plan.overagePriceCentsPerTicket;
  const capCents = plan.cappedAmountUsd * 100;
  return overageCostCents < capCents;
}
