"use client";

import { ChatInterface } from "@/components/chat/ChatInterface";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Sparkles, Bot, ArrowRight, Store, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/track-client";

export default function DemoPage() {
  const [session, setSession] = useState<{ authenticated: boolean; shop?: string } | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mode, setMode] = useState<"sample" | "live">("sample");

  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string>("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => setSession(data))
      .catch(() => setSession({ authenticated: false }))
      .finally(() => setLoadingSession(false));
  }, []);

  const connectedShop = session?.authenticated ? session.shop : undefined;
  const canLive = !!connectedShop;

  useEffect(() => {
    if (canLive) setMode("live");
  }, [canLive]);

  useEffect(() => {
    setStarted(false);
    setToken("");
  }, [mode]);

  const EMAIL_RE = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const startLive = async () => {
    if (!connectedShop) return;
    if (!EMAIL_RE.test(email.trim())) return;
    setLoadingToken(true);
    track("demo_start_live", { mode: "live" });
    try {
      const r = await fetch(`/api/widget/token?shop=${encodeURIComponent(connectedShop)}`);
      if (!r.ok) throw new Error("Failed to get widget token");
      const data = await r.json() as { token?: string };
      setToken(data.token || "");
      setStarted(true);
    } catch {
      setToken("");
      setStarted(false);
    } finally {
      setLoadingToken(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
          <div className="flex items-center gap-2">
            {!loadingSession && canLive && (
              <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1 py-1 text-[11px] font-medium text-zinc-600 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMode("live")}
                  className={`rounded-full px-2.5 py-1 transition-colors ${mode === "live" ? "bg-emerald-100 text-emerald-800" : "hover:bg-zinc-100"}`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setMode("sample")}
                  className={`rounded-full px-2.5 py-1 transition-colors ${mode === "sample" ? "bg-amber-100 text-amber-800" : "hover:bg-zinc-100"}`}
                >
                  Sample
                </button>
              </div>
            )}
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
              mode === "live" ? "border-emerald-200/60 bg-emerald-50 text-emerald-700" : "border-amber-200/60 bg-amber-50 text-amber-700"
            }`}>
              <Info className="h-3 w-3" />
              {mode === "live" ? "Live Mode" : "Demo Mode — Sample Data"}
            </div>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 py-5">
        <div className="animate-scale-in flex flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/5">
          {mode === "live" && canLive ? (
            started ? (
              <ChatInterface shop={connectedShop} customerEmail={email.trim()} widgetToken={token} />
            ) : (
              <div className="flex h-full flex-col bg-white">
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
                <div className="flex flex-1 flex-col items-center justify-center p-6 animate-scale-in">
                  <div className="w-full max-w-xs space-y-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-sm">
                        <Store className="h-7 w-7 text-emerald-700" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-zinc-900">Live Store Demo</h1>
                        <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                          Enter a customer email to look up real orders in{" "}
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700">{connectedShop}</span>.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        startLive();
                      }}
                      className="space-y-3"
                    >
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="customer@example.com"
                          required
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loadingToken || !EMAIL_RE.test(email.trim())}
                        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        {loadingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Start Live Chat
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </form>

                    <div className="text-center text-[10px] text-zinc-300">
                      Uses your connected store + widget token for secure access.
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <ChatInterface />
          )}
        </div>

        {/* Hints (hide on small screens to keep chat footer anchored) */}
        <div className="hidden sm:block animate-fade-in mt-4 space-y-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-700">{mode === "live" && canLive ? "Try:" : "Try saying:"}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {mode === "live" && canLive
                  ? "Ask for order status, tracking, or request a return/exchange. Auri will render interactive UI cards."
                  : "“I bought some sneakers and they're too small” or “Where is order #1001?”"}
              </p>
            </div>
          </div>
          <div className="text-center">
            {loadingSession ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Checking store connection…
              </span>
            ) : canLive ? (
              <Link href="/admin" className="group inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-900">
                <Store className="h-3.5 w-3.5" />
                Manage connected store
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <Link href="/connect" className="group inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 transition-colors hover:text-violet-800">
                <Bot className="h-3.5 w-3.5" />
                Connect your own store
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
