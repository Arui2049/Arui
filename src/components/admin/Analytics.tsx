"use client";

import { BarChart3, PieChart, TrendingUp } from "lucide-react";

interface DailyCount { date: string; count: number }
interface TypeBreakdown { type: string; count: number }

const TYPE_LABELS: Record<string, string> = {
  return: "Returns",
  exchange: "Exchanges",
  tracking: "Tracking",
  inquiry: "Inquiries",
};

const TYPE_COLORS: Record<string, string> = {
  return: "bg-red-400",
  exchange: "bg-amber-400",
  tracking: "bg-blue-400",
  inquiry: "bg-zinc-400",
};

function MiniBarChart({ data }: { data: DailyCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[3px] h-24">
      {data.map((d) => {
        const h = Math.max(4, (d.count / max) * 100);
        const day = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-violet-500 to-indigo-400 transition-all duration-300 min-w-[6px]"
              style={{ height: `${h}%` }}
              title={`${d.date}: ${d.count} tickets`}
            />
            <span className="text-[9px] text-zinc-400">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

function TypeDonut({ data }: { data: TypeBreakdown[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-24">
        <p className="text-xs text-zinc-400">No data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.round((d.count / total) * 100);
        return (
          <div key={d.type} className="flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[d.type] || "bg-zinc-300"}`} />
            <span className="flex-1 text-xs text-zinc-700">{TYPE_LABELS[d.type] || d.type}</span>
            <span className="text-xs font-medium text-zinc-500">{d.count}</span>
            <div className="w-16 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${TYPE_COLORS[d.type] || "bg-zinc-300"} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

interface AnalyticsProps {
  dailyCounts: DailyCount[];
  typeBreakdown: TypeBreakdown[];
  resolvedRate: number;
}

export function AnalyticsSection({ dailyCounts, typeBreakdown, resolvedRate }: AnalyticsProps) {
  const hasData = dailyCounts.some((d) => d.count > 0) || typeBreakdown.length > 0;

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-violet-600" />
        <h2 className="text-sm font-semibold text-zinc-900">Analytics</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily trend */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-zinc-700">Tickets (14 days)</span>
            </div>
            <span className="text-[10px] text-zinc-400">
              {dailyCounts.reduce((s, d) => s + d.count, 0)} total
            </span>
          </div>
          {hasData ? (
            <MiniBarChart data={dailyCounts} />
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs text-zinc-400">Ticket data will appear here as customers interact.</p>
            </div>
          )}
        </div>

        {/* Stats column */}
        <div className="space-y-4">
          {/* Type breakdown */}
          <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <PieChart className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-zinc-700">By Type</span>
            </div>
            <TypeDonut data={typeBreakdown} />
          </div>

          {/* Resolution rate */}
          <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
            <div className="mb-3 text-xs font-semibold text-zinc-700">Resolution Rate</div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-zinc-900">{resolvedRate}%</span>
              <span className="mb-1 text-[11px] text-zinc-400">resolved</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${resolvedRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
