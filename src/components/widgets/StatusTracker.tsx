"use client";

import { Truck, PackageCheck, MapPin, Clock, CheckCircle2, ExternalLink, PackageX, ArrowRight } from "lucide-react";

interface TrackingEvent { status: string; message: string; timestamp: string; location?: string }
interface TrackingData {
  orderName: string;
  number?: string | null;
  url?: string | null;
  company?: string | null;
  status?: string | null;
  events?: TrackingEvent[];
  message?: string;
}

const ICONS: Record<string, typeof Truck> = { created: Clock, picked_up: PackageCheck, in_transit: Truck, out_for_delivery: MapPin, delivered: CheckCircle2, not_shipped: PackageX };
const STEP_COLORS: Record<string, { active: string; dot: string }> = {
  created: { active: "text-zinc-600", dot: "bg-zinc-400" },
  picked_up: { active: "text-blue-600", dot: "bg-blue-500" },
  in_transit: { active: "text-blue-600", dot: "bg-blue-500" },
  out_for_delivery: { active: "text-amber-600", dot: "bg-amber-500" },
  delivered: { active: "text-emerald-600", dot: "bg-emerald-500" },
};
const STEPS = ["created", "picked_up", "in_transit", "out_for_delivery", "delivered"];
const STEP_LABELS = ["Label", "Pickup", "Transit", "Out", "Delivered"];

function fmtTs(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function StatusTracker({ data }: { data: TrackingData }) {
  if (data.status === "not_shipped" || (!data.events?.length && !data.number)) {
    return (
      <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <PackageX className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-800">{data.orderName}</div>
            <div className="text-[11px] text-amber-600">Not yet shipped</div>
          </div>
        </div>
        <p className="mt-2 text-xs text-amber-700 leading-relaxed">{data.message || "This order hasn't been shipped yet. You'll receive a notification when it's on its way."}</p>
      </div>
    );
  }

  const events = data.events || [];
  const cur = data.status || events[events.length - 1]?.status || "created";
  const curIdx = STEPS.indexOf(cur);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100/80 bg-zinc-50/30 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{data.orderName}</div>
          {data.company && data.number && (
            <div className="mt-0.5 text-[11px] text-zinc-500">{data.company} &middot; <span className="font-mono text-zinc-400">{data.number}</span></div>
          )}
        </div>
        {data.url && data.url !== "#" && (
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
            <ExternalLink className="h-3 w-3" />Track
            <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center">
          {STEPS.map((step, i) => {
            const reached = i <= curIdx;
            const isCur = step === cur;
            const color = STEP_COLORS[step] || STEP_COLORS.created;
            return (
              <div key={step} className="flex flex-1 items-center">
                <div className={`relative h-2.5 w-2.5 rounded-full transition-all duration-500 ${isCur ? `${color.dot} ring-[3px] ring-opacity-20 ring-current ${color.active}` : reached ? "bg-emerald-500" : "bg-zinc-200"}`}>
                  {isCur && <div className={`absolute inset-0 rounded-full ${color.dot} animate-ping opacity-30`} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-[2px] flex-1 transition-all duration-500 ${i < curIdx ? "bg-emerald-400" : "bg-zinc-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={`text-[9px] font-medium transition-colors ${i <= curIdx ? "text-zinc-600" : "text-zinc-300"}`}>{label}</span>
          ))}
        </div>
      </div>

      {/* Events timeline */}
      <div className="border-t border-zinc-100/80 px-4 py-3 space-y-0">
        {[...events].reverse().map((ev, i) => {
          const Icon = ICONS[ev.status] || Clock;
          const isFirst = i === 0;
          return (
            <div key={i} className="flex gap-3 py-2">
              <div className="flex flex-col items-center">
                <div className={`rounded-lg p-1.5 ${isFirst ? "bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600" : "bg-zinc-100 text-zinc-400"}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {i < events.length - 1 && <div className="mt-1 h-full w-px bg-zinc-200/80" />}
              </div>
              <div className="flex-1 pb-1">
                <div className={`text-[13px] ${isFirst ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>{ev.message}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span>{fmtTs(ev.timestamp)}</span>
                  {ev.location && <><span className="text-zinc-300">&middot;</span><span>{ev.location}</span></>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
