"use client";

import { CheckCircle2, Printer, AlertCircle } from "lucide-react";

interface ReturnData {
  success: boolean;
  returnId?: string;
  orderName?: string;
  itemTitle?: string;
  action?: string;
  reason?: string;
  exchangeDetails?: string;
  instructions?: { step1: string; step2: string; step3: string; deadline: string };
  labelUrl?: string;
  message?: string;
}

export function ReturnConfirmation({ data }: { data: ReturnData }) {
  if (!data.success) {
    return (
      <div className="rounded-xl border border-red-200/60 bg-gradient-to-br from-red-50 to-rose-50/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <AlertCircle className="h-4 w-4" />
          Return request failed
        </div>
        <div className="mt-1.5 text-xs text-red-600 leading-relaxed">{data.message || "Please try again or contact support."}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200/60 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-white" />
        <span className="text-sm font-semibold text-white">
          {data.action === "exchange" ? "Exchange" : "Return"} Created
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Return ID", value: data.returnId, mono: true },
            { label: "Order", value: data.orderName },
            { label: "Item", value: data.itemTitle },
            { label: "Reason", value: data.reason?.replace(/_/g, " ") },
          ].map((field) => field.value && (
            <div key={field.label}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{field.label}</div>
              <div className={`mt-0.5 text-xs font-semibold text-zinc-900 ${field.mono ? "font-mono" : ""}`}>{field.value}</div>
            </div>
          ))}
          {data.exchangeDetails && (
            <div className="col-span-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Exchange For</div>
              <div className="mt-0.5 text-xs font-semibold text-zinc-900">{data.exchangeDetails}</div>
            </div>
          )}
        </div>
        {data.instructions && (
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Next Steps</div>
            <ol className="space-y-2">
              {[data.instructions.step1, data.instructions.step2, data.instructions.step3].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
              <span>⏰</span>{data.instructions.deadline}
            </div>
          </div>
        )}
        {data.labelUrl && (
          <a href={data.labelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition-all hover:shadow-md hover:-translate-y-0.5">
            <Printer className="h-4 w-4" />Print Return Label
          </a>
        )}
      </div>
    </div>
  );
}
