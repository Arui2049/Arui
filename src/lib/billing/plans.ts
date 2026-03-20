export interface PricingPlan {
  key: string;
  name: string;
  monthlyPriceUsd: number;
  includedTickets: number;
  overagePriceCentsPerTicket: number;
  cappedAmountUsd: number;
  trialDays: number;
  highlight?: boolean;
}

export const PLANS: Record<string, PricingPlan> = {
  free: {
    key: "free",
    name: "Free",
    monthlyPriceUsd: 0,
    includedTickets: 50,
    overagePriceCentsPerTicket: 0,
    cappedAmountUsd: 0,
    trialDays: 0,
  },
  starter: {
    key: "starter",
    name: "Starter",
    monthlyPriceUsd: 19,
    includedTickets: 200,
    overagePriceCentsPerTicket: 0,
    cappedAmountUsd: 0,
    trialDays: 14,
  },
  growth: {
    key: "growth",
    name: "Growth",
    monthlyPriceUsd: 49,
    includedTickets: 1000,
    overagePriceCentsPerTicket: 6,
    cappedAmountUsd: 149,
    trialDays: 14,
    highlight: true,
  },
  pro: {
    key: "pro",
    name: "Pro",
    monthlyPriceUsd: 99,
    includedTickets: 3000,
    overagePriceCentsPerTicket: 4,
    cappedAmountUsd: 249,
    trialDays: 14,
  },
};

export const PLAN_KEYS = ["free", "starter", "growth", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export function getPlan(key: string | undefined): PricingPlan {
  if (key && key in PLANS) return PLANS[key];
  return PLANS.free;
}

export function getPlanByName(name: string | undefined): PricingPlan {
  if (!name) return PLANS.free;
  const lower = name.toLowerCase();
  for (const p of Object.values(PLANS)) {
    if (p.name.toLowerCase() === lower) return p;
  }
  if (lower.includes("starter")) return PLANS.starter;
  if (lower.includes("growth")) return PLANS.growth;
  if (lower.includes("pro")) return PLANS.pro;
  return PLANS.free;
}

export function getPaidPlans(): PricingPlan[] {
  return PLAN_KEYS.filter((k) => k !== "free").map((k) => PLANS[k]);
}
