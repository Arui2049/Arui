"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Bot, ArrowRight, Mail, AlertCircle, MessageSquare } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readTokenFromLocationHash(): string {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return "";
  const qs = hash.slice(1);
  const sp = new URLSearchParams(qs);
  return sp.get("token") || "";
}

export default function WidgetPage() {
  const params = useParams<{ shop: string }>();
  const searchParams = useSearchParams();
  const shop = decodeURIComponent(params.shop);
  const tokenFromQuery = searchParams.get("token") || "";
  const [token, setToken] = useState(tokenFromQuery);

  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Support tokens passed either as query (?token=) or hash (#token=).
    if (!tokenFromQuery) {
      const fromHash = readTokenFromLocationHash();
      if (fromHash) setToken(fromHash);
      const onHashChange = () => {
        const next = readTokenFromLocationHash();
        if (next) setToken(next);
      };
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    }
    return;
  }, [tokenFromQuery]);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    fetch("/api/widget/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, token }),
    })
      .then((r) => {
        setValid(r.ok);
        if (r.ok) {
          fetch("/api/widget/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop, token }),
          }).catch(() => {});
        }
      })
      .catch(() => setValid(false));
  }, [shop, token]);

  if (valid === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="relative">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          </div>
          <p className="text-[11px] text-zinc-400">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-white p-8 text-center animate-scale-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
          <AlertCircle className="h-6 w-6 text-zinc-400" />
        </div>
        <h1 className="text-sm font-semibold text-zinc-700">Store Not Connected</h1>
        <p className="mt-1.5 max-w-[200px] text-xs text-zinc-400 leading-relaxed">
          This store hasn&apos;t set up Auri yet. Please contact the store owner.
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex h-dvh flex-col bg-white">
        {/* Top gradient accent */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500" />

        <div className="flex flex-1 flex-col items-center justify-center p-6 animate-scale-in">
          <div className="w-full max-w-xs space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 shadow-sm">
                <Bot className="h-7 w-7 text-violet-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900">Hi there! 👋</h1>
                <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                  Enter your email and we&apos;ll look up your orders right away.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (EMAIL_RE.test(email.trim())) setStarted(true);
              }}
              className="space-y-3"
            >
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <button
                type="submit"
                disabled={!EMAIL_RE.test(email.trim())}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:shadow-lg hover:shadow-violet-300 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                Start Chat
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="text-center text-[10px] text-zinc-300">
              Powered by <span className="font-medium text-zinc-400">Auri</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh animate-fade-in">
      <ChatInterface shop={shop} customerEmail={email} widgetToken={token} />
    </div>
  );
}
