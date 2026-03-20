"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  action?: { label: string; href: string; external?: boolean };
}

interface SetupChecklistProps {
  storeConnected: boolean;
  widgetInstalled: boolean;
  hasTestTicket: boolean;
  themeEditorUrl?: string;
  paidActive?: boolean;
}

export function SetupChecklist({ storeConnected, widgetInstalled, hasTestTicket, themeEditorUrl, paidActive }: SetupChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const steps: SetupStep[] = [
    {
      id: "connect",
      label: "Connect Shopify Store",
      description: "Link your Shopify store via OAuth to enable order lookups and returns.",
      completed: storeConnected,
      action: storeConnected ? undefined : { label: "Connect", href: "/connect" },
    },
    {
      id: "widget",
      label: "Enable App Embed in Theme Editor",
      description: "Turn on Auri in your theme (Theme editor → App embeds). No code changes needed.",
      completed: widgetInstalled,
      action: widgetInstalled
        ? undefined
        : themeEditorUrl
          ? { label: "Open Theme Editor", href: themeEditorUrl, external: true }
          : { label: "View Guide", href: "#embed-code" },
    },
    {
      id: "test",
      label: "Send a Test Return Request",
      description: "Try the demo or widget to verify everything works end-to-end.",
      completed: hasTestTicket,
      action: hasTestTicket ? undefined : { label: "Try Demo", href: "/demo" },
    },
    ...(!storeConnected || paidActive ? [] : [{
      id: "plan",
      label: "Choose a Plan",
      description: "Start a trial to remove the 50 ticket/month limit and keep the widget running.",
      completed: false,
      action: { label: "Upgrade", href: "#billing" },
    }] as SetupStep[]),
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  return (
    <div className="animate-slide-down mb-6 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50 via-indigo-50/50 to-violet-50 shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
            <Rocket className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-violet-900">Quick Setup</h3>
            <p className="text-xs text-violet-600">{completedCount} of {steps.length} steps completed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-violet-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="text-[10px] text-violet-400 hover:text-violet-600 transition-colors"
          >
            Dismiss
          </button>
          {collapsed ? <ChevronDown className="h-4 w-4 text-violet-400" /> : <ChevronUp className="h-4 w-4 text-violet-400" />}
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-violet-100 px-5 pb-5 pt-3">
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className={`flex items-start gap-3 rounded-xl px-3.5 py-3 transition-colors ${step.completed ? "bg-white/50" : "bg-white/80"}`}>
                {step.completed ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-300" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${step.completed ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                    {step.label}
                  </div>
                  <p className={`text-xs mt-0.5 ${step.completed ? "text-zinc-300" : "text-zinc-500"}`}>
                    {step.description}
                  </p>
                </div>
                {step.action && !step.completed && (
                  <Link
                    href={step.action.href}
                    target={step.action.external ? "_blank" : undefined}
                    className="shrink-0 flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-violet-700"
                  >
                    {step.action.label}
                    {step.action.external && <ExternalLink className="h-3 w-3" />}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
