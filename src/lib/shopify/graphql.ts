import { captureException } from "@/lib/errors";

export type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

export async function shopifyGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
  apiVersion?: string,
): Promise<ShopifyGraphqlResponse<T>> {
  const version = apiVersion || process.env.SHOPIFY_API_VERSION || "2026-01";
  const endpoint = `https://${shop}/admin/api/${version}/graphql.json`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      captureException(new Error(`Shopify GraphQL HTTP ${res.status}: ${text.slice(0, 300)}`), {
        shop,
        route: "shopify_graphql",
        status: res.status,
      });
      return { errors: [{ message: `Shopify GraphQL error (${res.status})` }] };
    }

    try {
      return JSON.parse(text) as ShopifyGraphqlResponse<T>;
    } catch {
      return { errors: [{ message: "Invalid JSON from Shopify GraphQL" }] };
    }
  } catch (err) {
    captureException(err, { shop, route: "shopify_graphql_network" });
    return { errors: [{ message: "Network error calling Shopify GraphQL" }] };
  }
}

