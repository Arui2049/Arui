import { getShop, getBilling, saveBilling, type BillingState } from "@/lib/store";
import { shopifyGraphql } from "@/lib/shopify/graphql";

type ActiveSub = {
  id: string;
  name: string;
  status: string;
  currentPeriodEnd?: string | null;
  trialDays?: number | null;
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
    const out: BillingState = {
      shop,
      status: "unknown",
      checkedAt: new Date().toISOString(),
      raw: resp,
    };
    saveBilling(out);
    return out;
  }

  const subs = resp.data?.currentAppInstallation?.activeSubscriptions || [];
  const sub = subs[0];

  const out: BillingState = {
    shop,
    status: mapStatus(sub?.status),
    subscriptionId: sub?.id,
    planName: sub?.name,
    currentPeriodEnd: sub?.currentPeriodEnd || undefined,
    trialDays: sub?.trialDays ?? undefined,
    checkedAt: new Date().toISOString(),
    raw: resp,
  };

  saveBilling(out);
  return out;
}

export async function createProSubscription(shop: string, returnUrl: string): Promise<{ confirmationUrl: string }> {
  const record = getShop(shop);
  if (!record?.accessToken) {
    throw new Error("Store not connected");
  }

  // Avoid creating duplicate subscriptions.
  const existing = await syncBillingFromShopify(shop);
  if (isPaidActive(existing)) {
    throw new Error("Subscription is already active.");
  }

  const planName = process.env.BILLING_PLAN_NAME || "Auri Pro";
  const amount = Number(process.env.BILLING_PRICE_USD || "19.0");
  const trialDays = Number(process.env.BILLING_TRIAL_DAYS || "7");
  const test = process.env.BILLING_TEST === "1" || process.env.BILLING_TEST === "true";

  const mutation = `
    mutation CreateSub($name: String!, $returnUrl: URL!, $trialDays: Int, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, trialDays: $trialDays, test: $test, lineItems: $lineItems) {
        confirmationUrl
        appSubscription { id status name }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    name: planName,
    returnUrl,
    trialDays: Number.isFinite(trialDays) && trialDays > 0 ? trialDays : null,
    test: test ? true : null,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount, currencyCode: "USD" },
          },
        },
      },
    ],
  };

  const resp = await shopifyGraphql<{
    appSubscriptionCreate?: {
      confirmationUrl?: string;
      appSubscription?: { id: string; status: string; name: string };
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

  // Optimistically save state; a later sync will finalize status.
  const sub = resp.data?.appSubscriptionCreate?.appSubscription;
  saveBilling({
    shop,
    status: mapStatus(sub?.status),
    subscriptionId: sub?.id,
    planName: sub?.name,
    checkedAt: new Date().toISOString(),
    raw: resp,
  });

  return { confirmationUrl: url };
}

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

