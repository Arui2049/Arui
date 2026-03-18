"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useMemo, Component, type ReactNode } from "react";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { OrderList } from "../widgets/OrderList";
import { ReturnConfirmation } from "../widgets/ReturnConfirmation";
import { StatusTracker } from "../widgets/StatusTracker";
import { EscalationCard } from "../widgets/EscalationCard";
import { track } from "@/lib/track-client";

function ToolPartRenderer({ part }: { part: Record<string, unknown> }) {
  const ptype = String(part.type || "");
  const state = String(part.state || "");
  const data = (part.output || part.result) as Record<string, unknown> | undefined;

  const toolName = ptype === "dynamic-tool"
    ? String(part.toolName || "")
    : ptype.startsWith("tool-")
      ? ptype.slice(5)
      : "";

  if (!data || state === "call" || state === "partial-call" || state === "streaming") {
    const labels: Record<string, string> = {
      lookup_orders: "Looking up your orders",
      initiate_return: "Processing return request",
      track_shipment: "Fetching tracking info",
      escalate_to_human: "Connecting you to support",
    };
    return (
      <div className="animate-fade-in flex items-center gap-2.5 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/50 px-4 py-3 text-sm text-violet-700">
        <div className="relative">
          <Loader2 className="h-4 w-4 animate-spin" />
          <div className="absolute inset-0 animate-ping opacity-20"><Loader2 className="h-4 w-4" /></div>
        </div>
        <span className="font-medium">{labels[toolName] || "Working..."}</span>
      </div>
    );
  }

  if (toolName === "lookup_orders" && data.orders) {
    return <div className="animate-slide-up"><OrderList orders={data.orders as never[]} /></div>;
  }
  if (toolName === "initiate_return") {
    return <div className="animate-scale-in"><ReturnConfirmation data={data as never} /></div>;
  }
  if (toolName === "track_shipment") {
    return <div className="animate-slide-up"><StatusTracker data={data as never} /></div>;
  }
  if (toolName === "escalate_to_human") {
    return <div className="animate-scale-in"><EscalationCard data={data as never} /></div>;
  }

  return null;
}

const SUGGESTIONS = [
  { text: "Where is my order?", icon: "📦" },
  { text: "I want to return an item", icon: "↩️" },
  { text: "Check order #1001", icon: "🔍" },
  { text: "Track my package", icon: "🚚" },
];

class ChatErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <RefreshCw className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="mb-1 text-sm font-semibold text-zinc-800">Something went wrong</p>
          <p className="mb-5 text-xs text-zinc-400">The chat encountered an unexpected error.</p>
          <button onClick={() => this.setState({ hasError: false })} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-700 hover:shadow-md">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ChatInterfaceProps {
  shop?: string;
  customerEmail?: string;
  widgetToken?: string;
}

export function ChatInterface(props: ChatInterfaceProps) {
  return (
    <ChatErrorBoundary>
      <ChatInterfaceInner {...props} />
    </ChatErrorBoundary>
  );
}

function ChatInterfaceInner({ shop, customerEmail, widgetToken }: ChatInterfaceProps) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          ...(shop ? { shop } : {}),
          ...(customerEmail ? { customerEmail } : {}),
          ...(widgetToken ? { widgetToken } : {}),
        },
      }),
    [shop, customerEmail, widgetToken],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: "Hi! I’m Auri, your AI support assistant. I can help you check order status, track shipments, and process returns or exchanges.\n\nHow can I help you today?" }],
      },
    ],
  });

  const busy = status === "streaming" || status === "submitted";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setInteracted(true);
    setInput("");
    track("chat_message_sent", { shop: shop || "demo-store" });
    sendMessage({ text });
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-zinc-200/50 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 px-4 py-3.5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm p-1">
          <img src="/logo.svg" alt="Auri Logo" className="h-full w-full" />
        </div>
        <div className="relative">
          <div className="text-sm font-semibold text-white">Auri</div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            Online
          </div>
        </div>
        <div className="relative ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/50 backdrop-blur-sm">
          <Sparkles className="h-3 w-3" />
          AI
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          const role = msg.role as string;
          const isUser = role === "user";
          return (
            <div key={msg.id} className={`flex gap-2.5 animate-fade-in ${isUser ? "justify-end" : ""}`}>
              {!isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100">
                  <Bot className="h-3.5 w-3.5 text-violet-600" />
                </div>
              )}
              <div className={`max-w-[85%] space-y-2 ${isUser ? "order-first" : ""}`}>
                {msg.parts.map((part, i) => {
                  const ptype = part.type as string;
                  if (ptype === "text" && "text" in part && part.text) {
                    return (
                      <div key={i} className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${isUser ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-md shadow-sm shadow-violet-200" : "bg-zinc-100/80 text-zinc-800 rounded-bl-md"}`}>
                        {part.text}
                      </div>
                    );
                  }
                  if (ptype.startsWith("tool-") || ptype === "dynamic-tool") {
                    return <ToolPartRenderer key={i} part={part as unknown as Record<string, unknown>} />;
                  }
                  return null;
                })}
              </div>
              {isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80">
                  <User className="h-3.5 w-3.5 text-zinc-600" />
                </div>
              )}
            </div>
          );
        })}

        {busy && (() => {
          const last = messages[messages.length - 1];
          const hasTool = last?.parts.some((p) => (p.type as string).startsWith("tool-") || (p.type as string) === "dynamic-tool");
          if (hasTool) return null;
          return (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100">
                <Bot className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-zinc-100/80 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Suggestions */}
      {!interacted && (
        <div className="animate-slide-up border-t border-zinc-100 px-4 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s.text} onClick={() => send(s.text)} className="flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-3 py-1.5 text-xs text-zinc-600 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 hover:shadow-sm active:scale-95">
                <span className="text-[11px]">{s.icon}</span>{s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-200/80 bg-white/80 backdrop-blur-sm p-3">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-200 transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm active:scale-95">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
