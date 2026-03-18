"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, LogOut, Ticket, Search, Filter, Package, RotateCcw, ArrowRightLeft, HelpCircle, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

interface TicketRecord {
  id: string;
  shop: string;
  customerEmail: string;
  orderName: string;
  type: "return" | "exchange" | "tracking" | "inquiry";
  status: "resolved" | "pending";
  summary: string;
  createdAt: string;
}

const TYPE_CONFIG = {
  return: { icon: RotateCcw, label: "Return", color: "text-red-600 bg-red-50" },
  exchange: { icon: ArrowRightLeft, label: "Exchange", color: "text-amber-600 bg-amber-50" },
  tracking: { icon: Package, label: "Tracking", color: "text-blue-600 bg-blue-50" },
  inquiry: { icon: HelpCircle, label: "Inquiry", color: "text-zinc-600 bg-zinc-100" },
};

const STATUS_CONFIG = {
  resolved: { label: "Resolved", dot: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50" },
  pending: { label: "Pending", dot: "bg-amber-500", text: "text-amber-700 bg-amber-50" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/tickets?limit=${pageSize}&offset=${page * pageSize}`)
      .then((r) => {
        if (r.status === 401) { router.push("/connect"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setTickets(data.tickets);
          setTotal(data.total);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router, page]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connect");
  };

  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.type !== filter && t.status !== filter) return false;
    if (search && !t.customerEmail.toLowerCase().includes(search.toLowerCase()) && !t.orderName.toLowerCase().includes(search.toLowerCase()) && !t.summary.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Auri Logo" className="h-7 w-7" />
              <span className="text-sm font-bold text-zinc-900">Auri</span>
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-medium text-zinc-600">Tickets</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300">
              <ArrowLeft className="h-3 w-3" />Dashboard
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-700">
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Title row */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Ticket History</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{total} total tickets</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, order, or summary..."
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            {["all", "return", "exchange", "tracking", "resolved", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filter === f ? "bg-violet-100 text-violet-700" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                <p className="text-xs text-zinc-400">Loading tickets...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
                <Ticket className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700">No tickets yet</p>
              <p className="mt-1 text-xs text-zinc-400">Tickets will appear here when customers use the chat widget.</p>
              <Link href="/demo" className="mt-4 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 transition-colors">
                <MessageSquare className="h-3 w-3" />Try Demo
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Order</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Summary</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((ticket) => {
                    const tc = TYPE_CONFIG[ticket.type];
                    const sc = STATUS_CONFIG[ticket.status];
                    const TypeIcon = tc.icon;
                    return (
                      <tr key={ticket.id} className="transition-colors hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${tc.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            {tc.label}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-zinc-800 truncate max-w-[160px]">{ticket.customerEmail}</div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="font-mono text-xs text-zinc-600">{ticket.orderName || "—"}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-zinc-500 truncate max-w-[240px]">{ticket.summary}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${sc.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[11px] text-zinc-400">{formatDate(ticket.createdAt)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
                  <span className="text-[11px] text-zinc-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-30"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
