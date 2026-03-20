"use client";

import { Package, RotateCcw, ArrowLeftRight } from "lucide-react";

interface OrderItem {
  id: number;
  title: string;
  variant: string | null;
  quantity: number;
  price: string;
  image?: string;
}

interface Order {
  id: number;
  name: string;
  date: string;
  status: string;
  total: string;
  currency: string;
  items: OrderItem[];
}

export interface OrderListProps {
  orders: Order[];
  onSelect?: (text: string) => void;
}

const statusColor: Record<string, string> = {
  fulfilled: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
  unfulfilled: "bg-amber-100 text-amber-700 border-amber-200/50",
  partially_fulfilled: "bg-blue-100 text-blue-700 border-blue-200/50",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
  in_transit: "bg-blue-100 text-blue-700 border-blue-200/50",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function OrderList({ orders, onSelect }: OrderListProps) {
  if (!orders.length) {
    return (
      <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-6 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
          <Package className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-600">No orders found</p>
        <p className="mt-0.5 text-xs text-zinc-400">We couldn&apos;t find any orders for this email.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {orders.map((order, idx) => (
        <div key={order.id} className={`rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md stagger-${idx + 1}`}>
          {/* Order header */}
          <div className="flex items-center justify-between border-b border-zinc-100/80 bg-zinc-50/30 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-zinc-900">{order.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor[order.status] || "bg-zinc-100 text-zinc-600 border-zinc-200/50"}`}>
                {order.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-zinc-900">${order.total}</div>
              <div className="text-[10px] text-zinc-400">{fmtDate(order.date)}</div>
            </div>
          </div>

          {/* Items */}
          <div className="divide-y divide-zinc-100/80">
            {order.items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-12 w-12 rounded-lg object-cover shadow-sm ring-1 ring-zinc-200/50 shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200/50">
                      <Package className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-zinc-900 truncate">{item.title}</div>
                    {item.variant && <div className="text-[11px] text-zinc-500">{item.variant}</div>}
                    <div className="text-[11px] text-zinc-400">Qty: {item.quantity} &middot; ${item.price}</div>
                  </div>
                </div>

                {/* Action buttons — only show when onSelect is wired up */}
                {onSelect && (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() =>
                        onSelect(
                          `I want to return the ${item.title}${item.variant ? ` (${item.variant})` : ""} from order ${order.name}`
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Return
                    </button>
                    <button
                      onClick={() =>
                        onSelect(
                          `I want to exchange the ${item.title}${item.variant ? ` (${item.variant})` : ""} from order ${order.name} for a different size or color`
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 active:scale-95"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                      Exchange
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
