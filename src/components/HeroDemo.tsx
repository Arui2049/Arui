"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Send, CheckCircle2, Printer, Package, ChevronRight, Sparkles } from "lucide-react";

const PRODUCT_IMAGES = {
  sneakers: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
  socks: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=200&h=200&fit=crop",
  coat: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&h=200&fit=crop",
};

interface DemoStep {
  type: "user" | "typing" | "orders" | "user2" | "exchange" | "done";
  delay: number;
}

const STEPS: DemoStep[] = [
  { type: "user", delay: 800 },
  { type: "typing", delay: 1200 },
  { type: "orders", delay: 600 },
  { type: "user2", delay: 1400 },
  { type: "typing", delay: 1000 },
  { type: "exchange", delay: 600 },
  { type: "done", delay: 3500 },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-100 to-indigo-100">
        <Bot className="h-3 w-3 text-violet-600" />
      </div>
      <div className="rounded-xl rounded-bl-sm bg-zinc-100 px-3.5 py-2.5">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-demo-msg">
      <div className="rounded-xl rounded-br-sm bg-gradient-to-br from-violet-600 to-indigo-600 px-3.5 py-2 text-[12px] leading-relaxed text-white shadow-sm shadow-violet-200/50">
        {text}
      </div>
    </div>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 animate-demo-msg">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-100 to-indigo-100">
        <Bot className="h-3 w-3 text-violet-600" />
      </div>
      <div className="rounded-xl rounded-bl-sm bg-zinc-100/80 px-3.5 py-2 text-[12px] leading-relaxed text-zinc-800">
        {text}
      </div>
    </div>
  );
}

function OrderCards() {
  return (
    <div className="flex items-start gap-2 animate-demo-msg">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-100 to-indigo-100">
        <Bot className="h-3 w-3 text-violet-600" />
      </div>
      <div className="flex-1 space-y-1.5 max-w-[85%]">
        <div className="rounded-xl rounded-bl-sm bg-zinc-100/80 px-3.5 py-2 text-[12px] text-zinc-800">
          I found 2 orders on your account. Which item do you need help with?
        </div>
        <div className="rounded-lg border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between bg-zinc-50/50 px-3 py-1.5 border-b border-zinc-100/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-900">#1001</span>
              <span className="rounded-full bg-emerald-100 border border-emerald-200/50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Fulfilled</span>
            </div>
            <span className="text-[11px] font-semibold text-zinc-900">$129.99</span>
          </div>
          {[
            { img: PRODUCT_IMAGES.sneakers, name: "Classic Runner Sneakers", variant: "White / Size 9", price: "$89.99", highlight: true },
            { img: PRODUCT_IMAGES.socks, name: "Cotton Crew Socks (3-Pack)", variant: "Black", price: "$19.99", highlight: false },
          ].map((item) => (
            <div key={item.name} className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${item.highlight ? "bg-violet-50/50" : ""}`}>
              <img src={item.img} alt={item.name} className="h-9 w-9 rounded-md object-cover shadow-sm ring-1 ring-zinc-200/50" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-zinc-900 truncate">{item.name}</div>
                <div className="text-[10px] text-zinc-400">{item.variant} · {item.price}</div>
              </div>
              <ChevronRight className={`h-3 w-3 shrink-0 ${item.highlight ? "text-violet-400" : "text-zinc-300"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExchangeConfirmation() {
  return (
    <div className="flex items-start gap-2 animate-demo-msg">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-100 to-indigo-100">
        <Bot className="h-3 w-3 text-violet-600" />
      </div>
      <div className="flex-1 space-y-1.5 max-w-[85%]">
        <div className="rounded-lg border border-emerald-200/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white">Exchange Created</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "RETURN ID", value: "RET-4A7X", mono: true },
                { label: "ORDER", value: "#1001" },
                { label: "ITEM", value: "Classic Runner Sneakers" },
                { label: "EXCHANGE FOR", value: "Size 10" },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[8px] font-medium uppercase tracking-wider text-zinc-400">{f.label}</div>
                  <div className={`text-[10px] font-semibold text-zinc-900 ${f.mono ? "font-mono" : ""}`}>{f.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md bg-zinc-50 p-2">
              <div className="mb-1.5 text-[8px] font-semibold uppercase tracking-wider text-zinc-500">Next Steps</div>
              <ol className="space-y-1">
                {["Pack in original packaging", "Print the return label", "Drop off at any UPS location"].map((step, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-zinc-600">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[7px] font-bold text-emerald-700">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <button className="flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-green-600 py-1.5 text-[10px] font-semibold text-white shadow-sm">
              <Printer className="h-3 w-3" /> Print Return Label
            </button>
          </div>
        </div>
        <div className="rounded-xl rounded-bl-sm bg-zinc-100/80 px-3.5 py-2 text-[12px] text-zinc-800">
          Your exchange is set! Pack the sneakers and drop them at any UPS location within 14 days.
        </div>
      </div>
    </div>
  );
}

export function HeroDemo() {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [cycle, setCycle] = useState(0);

  const runSequence = useCallback(() => {
    setVisibleSteps(0);
    let currentStep = 0;
    let totalDelay = 400;

    const showNext = () => {
      if (currentStep >= STEPS.length) return;
      const step = STEPS[currentStep];
      const delay = currentStep === 0 ? totalDelay : step.delay;
      setTimeout(() => {
        currentStep++;
        setVisibleSteps(currentStep);
        if (currentStep < STEPS.length) {
          totalDelay = STEPS[currentStep].delay;
          showNext();
        } else {
          setTimeout(() => setCycle((c) => c + 1), STEPS[STEPS.length - 1].delay);
        }
      }, delay);
    };

    showNext();
  }, []);

  useEffect(() => {
    runSequence();
  }, [cycle, runSequence]);

  const showTyping1 = visibleSteps >= 2 && visibleSteps < 3;
  const showTyping2 = visibleSteps >= 5 && visibleSteps < 6;

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* Phone frame */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/10 overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-zinc-900 px-5 py-1.5">
          <span className="text-[10px] font-medium text-white/60">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-white/40" />
            <div className="h-2 w-3.5 rounded-sm bg-white/40" />
          </div>
        </div>

        {/* Chat header */}
        <div className="relative flex items-center gap-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 px-4 py-2.5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm p-0.5">
            <img src="/logo.svg" alt="Auri" className="h-full w-full" />
          </div>
          <div className="relative">
            <div className="text-[12px] font-semibold text-white">Auri</div>
            <div className="flex items-center gap-1 text-[9px] text-white/60">
              <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              Online
            </div>
          </div>
          <div className="relative ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[8px] text-white/50 backdrop-blur-sm">
            <Sparkles className="h-2.5 w-2.5" />
            AI
          </div>
        </div>

        {/* Messages area */}
        <div className="h-[380px] overflow-hidden bg-white px-3 py-3 space-y-2.5">
          {/* Welcome */}
          <BotBubble text="Hi! I'm Auri. How can I help you today?" />

          {/* Step 1: User message */}
          {visibleSteps >= 1 && (
            <UserBubble text="My sneakers are too small, I need a bigger size" />
          )}

          {/* Step 2: Typing */}
          {showTyping1 && <TypingDots />}

          {/* Step 3: Order cards */}
          {visibleSteps >= 3 && <OrderCards />}

          {/* Step 4: User taps sneakers */}
          {visibleSteps >= 4 && (
            <UserBubble text="The Classic Runner Sneakers — I need Size 10" />
          )}

          {/* Step 5: Typing */}
          {showTyping2 && <TypingDots />}

          {/* Step 6: Exchange confirmation */}
          {visibleSteps >= 6 && <ExchangeConfirmation />}
        </div>

        {/* Input bar */}
        <div className="border-t border-zinc-200/80 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-[11px] text-zinc-400">
              Type your message...
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-sm shadow-violet-200/50">
              <Send className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-3 top-24 animate-float rounded-lg border border-emerald-200/60 bg-white px-2.5 py-1.5 shadow-lg shadow-emerald-100/50 [animation-delay:1s]">
        <div className="flex items-center gap-1.5">
          <Package className="h-3 w-3 text-emerald-600" />
          <span className="text-[10px] font-semibold text-emerald-700">Auto-resolved</span>
        </div>
      </div>
      <div className="absolute -left-3 top-52 animate-float rounded-lg border border-violet-200/60 bg-white px-2.5 py-1.5 shadow-lg shadow-violet-100/50 [animation-delay:2.5s]">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-violet-600" />
          <span className="text-[10px] font-semibold text-violet-700">~30 seconds</span>
        </div>
      </div>
    </div>
  );
}
