"use client";

import { BarChart3, PieChart, CheckCircle2 } from "lucide-react";

interface DailyCount { date: string; count: number }
interface TypeBreakdown { type: string; count: number }

interface AnalyticsChartsProps {
  dailyCounts: DailyCount[];
  typeBreakdown: TypeBreakdown[];
  resolvedRate: number;
}

const TYPE_LABELS: Record<string, string> = {
  return: "Returns",
  exchange: "Exchanges",
  tracking: "Tracking",
  inquiry: "Inquiries",
};

const TYPE_COLORS: Record<string, { bar: string; text: string }> = {
  return: { bar: "bg-red-400", text: "text-red-600" },
  exchange: { bar: "bg-amber-400", text: "text-amber-600" },
  tracking: { bar: "bg-blue-400", text: "text-blue-600" },
  inquiry: { bar: "bg-zinc-400", text: "text-zinc-600" },
};

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrendChart({ data }: { data: DailyCount[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
          <BarChart3 className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Ticket Trend</h2>
          <p className="text-[11px] text-zinc-400">Last 14 days</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-zinc-400">No ticket data yet. Tickets will appear as customers use the chat.</p>
        </div>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {data.map((d, i) => {
            const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            return (
              <div key={i} className="group relative flex-1 flex flex-col items-center justify-end">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                  {d.count} ticket{d.count !== 1 ? "s" : ""}
                  <br />{formatShortDate(d.date)}
                </div>
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-violet-500 to-indigo-400 transition-all duration-300 hover:from-violet-600 hover:to-indigo-500"
                  style={{ height: `${Math.max(height, d.count > 0 ? 8 : 2)}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                />
              </div>
            );
          })}
        </div>
      )}

      {hasData && (
        <div className="mt-2 flex justify-between text-[9px] text-zinc-400">
          <span>{formatShortDate(data[0].date)}</span>
          <span>{formatShortDate(data[data.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}

function TypeDistribution({ data, resolvedRate }: { data: TypeBreakdown[]; resolvedRate: number }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const hasData = total > 0;

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <PieChart className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Breakdown</h2>
          <p className="text-[11px] text-zinc-400">By ticket type</p>
        </div>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-zinc-400">No data available yet.</p>
        </div>
      ) : (
        <>
          {/* Type bars */}
          <div className="space-y-3 mb-5">
            {data.map((item) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              const colors = TYPE_COLORS[item.type] || TYPE_COLORS.inquiry;
              return (
                <div key={item.type}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`text-xs font-medium ${colors.text}`}>
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    <span className="text-[11px] text-zinc-400">{item.count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div className={`h-full rounded-full ${colors.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resolved rate */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50/50 p-3.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div className="flex-1">
                <div className="text-xs font-medium text-emerald-800">Resolution Rate</div>
                <p className="text-[11px] text-emerald-600">{resolvedRate}% of tickets resolved</p>
              </div>
              <span className="text-lg font-bold text-emerald-700">{resolvedRate}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AnalyticsCharts({ dailyCounts, typeBreakdown, resolvedRate }: AnalyticsChartsProps) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <TrendChart data={dailyCounts} />
      <TypeDistribution data={typeBreakdown} resolvedRate={resolvedRate} />
    </div>
  );
}
