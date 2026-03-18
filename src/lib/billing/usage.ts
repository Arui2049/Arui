import { getUsage, incrementUsage } from "../store";

const FREE_LIMIT = 50;
const OVERAGE_CENTS = 15;

export interface UsageSummary {
  shop: string;
  month: string;
  ticketCount: number;
  freeRemaining: number;
  overageCount: number;
  overageCostDisplay: string;
}

function build(shop: string, month: string, count: number): UsageSummary {
  const over = Math.max(0, count - FREE_LIMIT);
  return {
    shop, month, ticketCount: count,
    freeRemaining: Math.max(0, FREE_LIMIT - count),
    overageCount: over,
    overageCostDisplay: `$${((over * OVERAGE_CENTS) / 100).toFixed(2)}`,
  };
}

export function trackTicket(shop: string) {
  const r = incrementUsage(shop);
  return build(r.shop, r.month, r.ticketCount);
}

export function getUsageSummary(shop: string) {
  const r = getUsage(shop);
  return build(r.shop, r.month, r.ticketCount);
}
