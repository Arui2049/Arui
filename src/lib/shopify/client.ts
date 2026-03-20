import type { ShopifyOrder, OrderForDisplay, TrackingEvent } from "./types";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-01";

export interface ShopifyApiError {
  status: number;
  message: string;
  retryable: boolean;
}

export class ShopifyClient {
  constructor(
    private shop: string,
    private accessToken: string,
  ) {}

  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const res = await fetch(
      `https://${this.shop}/admin/api/${API_VERSION}${endpoint}`,
      {
        ...init,
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
          "Content-Type": "application/json",
          ...init?.headers,
        },
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err: ShopifyApiError = {
        status: res.status,
        message: this.friendlyError(res.status, body),
        retryable: res.status >= 500 || res.status === 429,
      };
      throw err;
    }
    return res.json() as Promise<T>;
  }

  private friendlyError(status: number, body: string): string {
    switch (status) {
      case 401: return "Store access token is invalid or expired. Please reconnect the store.";
      case 403: return "Insufficient permissions. Please reinstall the app with the required scopes.";
      case 404: return "The requested resource was not found.";
      case 429: return "Too many requests to the store. Please try again in a moment.";
      default: return `Shopify API error (${status}): ${body.slice(0, 200)}`;
    }
  }

  async getOrdersByEmail(email: string, limit = 5): Promise<OrderForDisplay[]> {
    const { orders } = await this.request<{ orders: ShopifyOrder[] }>(
      `/orders.json?email=${encodeURIComponent(email)}&status=any&limit=${limit}&order=created_at+desc`,
    );
    return orders.map((o) => this.fmt(o));
  }

  async getOrderById(orderId: number): Promise<OrderForDisplay | null> {
    try {
      const { order } = await this.request<{ order: ShopifyOrder }>(
        `/orders/${orderId}.json`,
      );
      return this.fmt(order);
    } catch {
      return null;
    }
  }

  async createReturn(
    orderId: number,
    lineItemId: number,
    reason: string,
    note?: string,
  ) {
    try {
      // Look up the fulfillment to get the correct fulfillment_line_item_id
      const { order } = await this.request<{ order: ShopifyOrder }>(
        `/orders/${orderId}.json?fields=id,fulfillments`,
      );

      let fulfillmentLineItemId: number | null = null;
      for (const f of order.fulfillments || []) {
        const match = f.line_items?.find((fli) => fli.line_item_id === lineItemId);
        if (match) {
          fulfillmentLineItemId = match.id;
          break;
        }
      }

      if (!fulfillmentLineItemId) {
        return { success: false, message: "This item has not been fulfilled yet and cannot be returned." };
      }

      const data = await this.request<{ return: { id: number } }>(
        `/orders/${orderId}/returns.json`,
        {
          method: "POST",
          body: JSON.stringify({
            return: {
              order_id: orderId,
              return_line_items: [
                { fulfillment_line_item_id: fulfillmentLineItemId, quantity: 1, return_reason: reason, customer_note: note || "" },
              ],
            },
          }),
        },
      );
      return { success: true, returnId: String(data.return.id) };
    } catch (err) {
      if (typeof err === "object" && err !== null && "message" in err) {
        return { success: false, message: (err as ShopifyApiError).message };
      }
      return { success: false, message: "Failed to create return request." };
    }
  }

  private fmt(o: ShopifyOrder): OrderForDisplay {
    const f = o.fulfillments?.[0];
    const events: TrackingEvent[] = [];
    if (f) {
      events.push({ status: "created", message: "Shipping label created", timestamp: f.created_at });
      if (f.shipment_status === "in_transit" || f.status === "success")
        events.push({ status: "in_transit", message: "Package in transit", timestamp: f.updated_at });
      if (f.status === "success")
        events.push({ status: "delivered", message: "Delivered", timestamp: f.updated_at });
    }
    return {
      id: o.id, name: o.name, date: o.created_at,
      status: o.fulfillment_status || "unfulfilled",
      total: o.total_price, currency: o.currency,
      items: o.line_items.map((li) => ({
        id: li.id, title: li.title, variant: li.variant_title,
        quantity: li.quantity, price: li.price,
        image: li.image?.src, productId: li.product_id, variantId: li.variant_id,
      })),
      tracking: f ? { number: f.tracking_number, url: f.tracking_url, company: f.tracking_company, status: f.shipment_status || f.status, events } : undefined,
    };
  }
}
