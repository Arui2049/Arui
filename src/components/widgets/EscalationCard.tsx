"use client";

import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

interface EscalationData {
  success: boolean;
  ticketId: string;
  reason: string;
  summary: string;
  message: string;
}

export function EscalationCard({ data }: { data: EscalationData }) {
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
          <AlertCircle className="h-4.5 w-4.5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Escalated to Support Team</h3>
          <p className="text-[11px] text-amber-600">
            Ticket <span className="font-mono font-medium">{data.ticketId}</span>
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-white/60 p-3.5">
        <div className="mb-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Summary</div>
        <p className="text-xs text-zinc-700 leading-relaxed">{data.summary}</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-white/60 p-3.5">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <p className="text-xs text-zinc-600 leading-relaxed">{data.message}</p>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        <span>A support agent will follow up via email</span>
      </div>
    </div>
  );
}
