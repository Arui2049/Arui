import { getShop, getBilling, saveBilling, type BillingState } from "@/lib/store";
import { shopifyGraphql } from "@/lib/shopify/graphql";
import { getPlan, getPlanByName, type PricingPlan } from "./plans";
import { captureException } from "@/lib/errors";

type ActiveSub = {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd?: string | null;
  trialDays?: number | null;
  lineItems?: Array<{
    id: string;
    plan?: {
      pricingDetails?: {
        __typename?: string;
        cappedAmount?: { amount?: string };
        terms?: string;
      };
    };
  }>;
};

function mapStatus(status: string | undefined): BillingState["status"] {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "TRIALING") return "trialing";
  if (s === "FROZEN") return "frozen";
  if (s === "CANCELED" || s === "CANCELLED") return "canceled";
  if (s === "PAST_DUE") return "past_due";
  if (s === "EXPIRED") return "expired";
  return s ? "unknown" : "none";
}

export function isPaidActive(b: BillingState | null): boolean {
  return !!b && (b.status === "active" || b.status === "trialing");
}

export function billingStale(b: BillingState | null, maxAgeMs = 6 * 60 * 60 * 1000): boolean {
  if (!b) return true;
  const t = Date.parse(b.checkedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > maxAgeMs;
}

export function getBillingCached(shop: string): BillingState | null {
  return getBilling(shop);
}

export function getEffectivePlan(b: BillingState | null): PricingPlan {
  if (!b || !isPaidActive(b)) return getPlan("free");
  if (b.planKey) return getPlan(b.planKey);
  return getPlanByName(b.planName);
}

// --- Sync active subscription from Shopify ---

export async function syncBillingFromShopify(shop: string): Promise<BillingState> {
  const record = getShop(shop);
  if (!record?.accessToken) {
    const out: BillingState = { shop, status: "none", checkedAt: new Date().toISOString() };
    saveBilling(out);
    return out;
  }

  const query = `
    query ActiveSubs {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          trialDays
          lineItems {
            id
            plan {
              pricingDetails {
                __typename
                ... on AppUsagePricing {
                  cappedAmount { amount }
                  terms
                }
              }
            }
          }
        }
      }
    }
  `;

  const resp = await shopifyGraphql<{ currentAppInstallation?: { activeSubscriptions?: ActiveSub[] } }>(
    shop,
    record.accessToken,
    query,
  );

  if (resp.errors && resp.errors.length > 0) {
    const out: BillingState = { shop, status: "unknown", checkedAt: new Date().toISOString(), raw: resp };
    saveBilling(out);
    return out;
  }

  const subs = resp.data?.currentAppInstallation?.activeSubscriptions || [];
  const sub = subs[0];

  let usageLineItemId: string | undefined;
  let cappedAmountUsd: number | undefined;
  if (sub?.lineItems) {
    for (const li of sub.lineItems) {
      if (li.plan?.pricingDetails?.__typename === "AppUsagePricing") {
        usageLineItemId = li.id;
        const raw = li.plan.pricingDetails.cappedAmount?.amount;
        if (raw) cappedAmountUsd = Number(raw);
      }
    }
  }

  const plan = getPlanByName(sub?.name);

  const out: BillingState = {
    shop,
    status: mapStatus(sub?.status),
    subscriptionId: sub?.id,
    planKey: plan.key !== "free" ? plan.key : undefined,
    planName: sub?.name,
    currentPeriodEnd: sub?.currentPeriodEnd || undefined,
    trialDays: sub?.trialDays ?? undefined,
    usageLineItemId,
    cappedAmountUsd,
    checkedAt: new Date().toISOString(),
    raw: resp,
  };

  saveBilling(out);
  return out;
}

// --- Create subscription (recurring + optional usage line item) ---

export async function createSubscription(shop: string, planKey: string, returnUrl: string): Promise<{ confirmationUrl: string }> {
  const record = getShop(shop);
  if (!record?.accessToken) {
    throw new Error("Store not connected");
  }

  const existing = await syncBillingFromShopify(shop);
  if (isPaidActive(existing)) {
    throw new Error("Subscription is already active. Cancel first to switch plans.");
  }

  const plan = getPlan(planKey);
  if (plan.key === "free" || plan.monthlyPriceUsd <= 0) {
    throw new Error("Cannot create a subscription for the free plan.");
  }

  const test = process.env.BILLING_TEST === "1" || process.env.BILLING_TEST === "true";

  const lineItems: Record<string, unknown>[] = [
    {
      plan: {
        appRecurringPricingDetails: {
          price: { amount: plan.monthlyPriceUsd, currencyCode: "USD" },
        },
      },
    },
  ];

  if (plan.overagePriceCentsPerTicket > 0 && plan.cappedAmountUsd > 0) {
    const overageUsd = plan.overagePriceCentsPerTicket / 100;
    lineItems.push({
      plan: {
        appUsagePricingDetails: {
          cappedAmount: { amount: plan.cappedAmountUsd, currencyCode: "USD" },
          terms: `Overage beyond ${plan.includedTickets} included tickets at $${overageUsd.toFixed(2)}/ticket, capped at $${plan.cappedAmountUsd}/month.`,
        },
      },
    });
  }

  const mutation = `
    mutation CreateSub($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, trialDays: $trialDays, test: $test, lineItems: $lineItems) {
        confirmationUrl
        appSubscription {
          id status name
          lineItems {
            id
            plan { pricingDetails { __typename ... on AppUsagePricing { cappedAmount { amount } terms } } }
          }
        }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    name: `Auri ${plan.name}`,
    returnUrl,
    trialDays: plan.trialDays > 0 ? plan.trialDays : null,
    test: test ? true : null,
    lineItems,
  };

  const resp = await shopifyGraphql<{
    appSubscriptionCreate?: {
      confirmationUrl?: string;
      appSubscription?: {
        id: string;
        status: string;
        name: string;
        lineItems?: Array<{
          id: string;
          plan?: { pricingDetails?: { __typename?: string; cappedAmount?: { amount?: string } } };
        }>;
      };
      userErrors?: Array<{ field?: string[]; message: string }>;
    };
  }>(shop, record.accessToken, mutation, variables);

  if (resp.errors && resp.errors.length > 0) {
    throw new Error(resp.errors.map((e) => e.message).join("; "));
  }

  const errs = resp.data?.appSubscriptionCreate?.userErrors || [];
  if (errs.length > 0) {
    throw new Error(errs.map((e) => e.message).join("; "));
  }

  const url = resp.data?.appSubscriptionCreate?.confirmationUrl || "";
  if (!url) {
    throw new Error("Missing confirmationUrl from Shopify");
  }

  const sub = resp.data?.appSubscriptionCreate?.appSubscription;
  let usageLineItemId: string | undefined;
  if (sub?.lineItems) {
    for (const li of sub.lineItems) {
      if (li.plan?.pricingDetails?.__typename === "AppUsagePricing") {
        usageLineItemId = li.id;
      }
    }
  }

  saveBilling({
    shop,
    status: mapStatus(sub?.status),
    subscriptionId: sub?.id,
    planKey: plan.key,
    planName: sub?.name,
    usageLineItemId,
    cappedAmountUsd: plan.cappedAmountUsd || undefined,
    checkedAt: new Date().toISOString(),
    raw: resp,
  });

  return { confirmationUrl: url };
}

// --- Report overage usage to Shopify ---

export async function reportUsageRecord(
  shop: string,
  ticketId: string,
  overageIndex: number,
): Promise<boolean> {
  const billing = getBilling(shop);
  if (!billing?.usageLineItemId || !isPaidActive(billing)) return false;

  const plan = getEffectivePlan(billing);
  if (plan.overagePriceCentsPerTicket <= 0) return false;

  const record = getShop(shop);
  if (!record?.accessToken) return false;

  const overageUsd = plan.overagePriceCentsPerTicket / 100;

  const mutation = `
    mutation UsageRecord($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!, $idempotencyKey: String!) {
      appUsageRecordCreate(subscriptionLineItemId: $subscriptionLineItemId, price: $price, description: $description, idempotencyKey: $idempotencyKey) {
        userErrors { field message }
        appUsageRecord { id }
      }
    }
  `;

  const variables = {
    subscriptionLineItemId: billing.usageLineItemId,
    price: { amount: overageUsd, currencyCode: "USD" },
    description: `Overage ticket #${overageIndex} (${ticketId})`,
    idempotencyKey: `${shop}:${ticketId}`,
  };

  try {
    const resp = await shopifyGraphql<{
      appUsageRecordCreate?: {
        userErrors?: Array<{ field?: string[]; message: string }>;
        appUsageRecord?: { id: string };
      };
    }>(shop, record.accessToken, mutation, variables);

    const errs = resp.data?.appUsageRecordCreate?.userErrors || [];
    if (errs.length > 0) {
      captureException(new Error(`Usage record error: ${errs.map((e) => e.message).join("; ")}`), { shop, route: "usage_record" });
      return false;
    }
    return true;
  } catch (err) {
    captureException(err, { shop, route: "usage_record" });
    return false;
  }
}

// --- Cancel subscription ---

export async function cancelSubscription(shop: string, prorate = false): Promise<BillingState> {
  const record = getShop(shop);
  if (!record?.accessToken) {
    throw new Error("Store not connected");
  }

  const current = await syncBillingFromShopify(shop);
  if (!current.subscriptionId) {
    throw new Error("No active subscription to cancel.");
  }

  const mutation = `
    mutation CancelSub($id: ID!, $prorate: Boolean) {
      appSubscriptionCancel(id: $id, prorate: $prorate) {
        userErrors { field message }
        appSubscription { id status name }
      }
    }
  `;

  const resp = await shopifyGraphql<{
    appSubscriptionCancel?: {
      userErrors?: Array<{ field?: string[]; message: string }>;
      appSubscription?: { id: string; status: string; name?: string };
    };
  }>(shop, record.accessToken, mutation, { id: current.subscriptionId, prorate });

  if (resp.errors && resp.errors.length > 0) {
    throw new Error(resp.errors.map((e) => e.message).join("; "));
  }

  const errs = resp.data?.appSubscriptionCancel?.userErrors || [];
  if (errs.length > 0) {
    throw new Error(errs.map((e) => e.message).join("; "));
  }

  return await syncBillingFromShopify(shop);
}
