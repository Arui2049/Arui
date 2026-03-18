export interface ShopifyLineItem {
  id: number;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;
  sku: string;
  image?: { src: string };
  product_id: number;
  variant_id: number;
}

export interface ShopifyFulfillmentLineItem {
  id: number;
  line_item_id: number;
  quantity: number;
}

export interface ShopifyFulfillment {
  id: number;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_company: string | null;
  created_at: string;
  updated_at: string;
  shipment_status: string | null;
  line_items?: ShopifyFulfillmentLineItem[];
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  line_items: ShopifyLineItem[];
  fulfillments: ShopifyFulfillment[];
}

export interface TrackingEvent {
  status: string;
  message: string;
  timestamp: string;
  location?: string;
}

export interface OrderForDisplay {
  id: number;
  name: string;
  date: string;
  status: string;
  total: string;
  currency: string;
  items: {
    id: number;
    title: string;
    variant: string | null;
    quantity: number;
    price: string;
    image?: string;
    productId: number;
    variantId: number;
  }[];
  tracking?: {
    number: string | null;
    url: string | null;
    company: string | null;
    status: string | null;
    events: TrackingEvent[];
  };
}
