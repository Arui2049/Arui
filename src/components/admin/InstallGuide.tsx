"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, Copy, FileCode2, Paintbrush, Eye, Save } from "lucide-react";

const STEPS = [
  {
    icon: Copy,
    title: "Copy the embed code",
    content: "Click the \"Copy\" button above to copy the widget embed script to your clipboard.",
  },
  {
    icon: FileCode2,
    title: "Open your Shopify theme editor",
    content: "Go to your Shopify Admin → Online Store → Themes → click \"...\" on your current theme → Edit code.",
  },
  {
    icon: Paintbrush,
    title: "Find theme.liquid",
    content: "In the left sidebar under \"Layout\", click on theme.liquid. Scroll to the bottom of the file and find the </body> tag.",
  },
  {
    icon: Eye,
    title: "Paste the embed code",
    content: "Paste the copied script tag just before the </body> closing tag. The widget will appear as a floating chat button on your storefront.",
  },
  {
    icon: Save,
    title: "Save and preview",
    content: "Click \"Save\" in the top right corner, then visit your store to see the Auri chat widget in the bottom-right corner.",
  },
];

export function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="mt-4 rounded-xl border border-zinc-200/60 bg-zinc-50/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600">
          <BookOpen className="h-3.5 w-3.5 text-violet-500" />
          Installation Guide
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
      </button>

      {open && (
        <div className="border-t border-zinc-200/60 px-4 pb-4 pt-3">
          <div className="space-y-1">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = activeStep === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setActiveStep(isActive ? null : i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${isActive ? "bg-violet-50" : "hover:bg-zinc-100"}`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isActive ? "bg-violet-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                      {i + 1}
                    </div>
                    <span className={`flex-1 text-xs font-medium ${isActive ? "text-violet-800" : "text-zinc-700"}`}>
                      {step.title}
                    </span>
                    <StepIcon className={`h-3.5 w-3.5 ${isActive ? "text-violet-500" : "text-zinc-400"}`} />
                  </button>
                  {isActive && (
                    <div className="animate-slide-down ml-12 mr-3 mt-1 mb-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-zinc-600 border border-zinc-100 shadow-sm">
                      {step.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
