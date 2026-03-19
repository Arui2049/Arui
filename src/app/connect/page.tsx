"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Store, CheckCircle2, ExternalLink, ShieldCheck, Copy, Check, MessageSquare, LogOut, ArrowRight, Code, Sparkles, AlertTriangle } from "lucide-react";
import { track } from "@/lib/track-client";
import { getPublicAppUrl } from "@/lib/app-url";

function EmbedCodeBlock({ shop }: { shop: string }) {
  const [copied, setCopied] = useState(false);
  const origin = getPublicAppUrl();
  const code = `<script src="${origin}/api/widget/embed?shop=${encodeURIComponent(shop)}"></script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Code className="h-3.5 w-3.5 text-violet-600" />
          <span className="text-xs font-semibold text-zinc-700">Embed Code</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300">
          {copied ? <><Check className="h-3 w-3 text-emerald-500" />Copied!</> : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <p className="mb-3 text-[11px] text-zinc-500 leading-relaxed">
        Paste this before the closing <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-[10px]">&lt;/body&gt;</code> tag in your Shopify theme.
      </p>
      <pre className="rb-scrollbar overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] text-emerald-400 leading-relaxed shadow-inner">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectPageContent />
    </Suspense>
  );
}

function ConnectPageContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<{ authenticated: boolean; shop?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setSession(data))
      .catch(() => setSession({ authenticated: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ authenticated: false });
  };

  const openWidgetTest = async (linkedShop: string) => {
    try {
      const r = await fetch(`/api/widget/token?shop=${encodeURIComponent(linkedShop)}`);
      if (!r.ok) {
        window.open(`/widget/${encodeURIComponent(linkedShop)}`, "_blank", "noopener,noreferrer");
        return;
      }
      const data = await r.json() as { token?: string };
      const token = data.token || "";
      window.open(
        `/widget/${encodeURIComponent(linkedShop)}?token=${encodeURIComponent(token)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      window.open(`/widget/${encodeURIComponent(linkedShop)}`, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <p className="text-xs text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (session?.authenticated && session.shop) {
    const linkedShop = session.shop;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-50 to-white p-4">
        <div className="w-full max-w-md space-y-4 animate-scale-in">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-zinc-900/5 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-zinc-900">Store Connected!</h1>
            <p className="mb-6 text-sm text-zinc-500">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700">{linkedShop}</span>
              {" "}is linked to Auri.
            </p>

            <div className="mb-6 text-left">
              <EmbedCodeBlock shop={linkedShop} />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => openWidgetTest(linkedShop)}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:shadow-lg hover:shadow-violet-300 hover:-translate-y-0.5"
              >
                <MessageSquare className="h-4 w-4" />Test Chat Widget
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <Link href="/admin" className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300">
                <ExternalLink className="h-4 w-4" />Go to Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <LogOut className="h-4 w-4" />Disconnect
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-indigo-50/50 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              <h3 className="text-xs font-semibold text-violet-800">Quick Setup Guide</h3>
            </div>
            <ol className="space-y-1.5 text-xs text-violet-700">
              <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200/60 text-[10px] font-bold text-violet-700">1</span>Copy the embed code above</li>
              <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200/60 text-[10px] font-bold text-violet-700">2</span>Paste into your Shopify theme (Online Store → Themes → Edit Code)</li>
              <li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-200/60 text-[10px] font-bold text-violet-700">3</span>Your customers can now chat with Auri!</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-50 to-white p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-zinc-900/5">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 shadow-sm">
            <Store className="h-7 w-7 text-violet-600" />
          </div>
          <h1 className="mb-1 text-center text-xl font-bold text-zinc-900">Connect Your Store</h1>
          <p className="mb-7 text-center text-sm text-zinc-500">Link your Shopify store to enable AI-powered returns &amp; tracking.</p>

          {oauthError && (
            <div className="mb-5 rounded-xl border border-red-200/60 bg-red-50 p-4">
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" />Connection Failed
              </div>
              <p className="text-xs text-red-700">{oauthError}</p>
              <p className="mt-2 text-[11px] text-red-600/80">
                Make sure your Shopify app&apos;s <strong>Allowed redirection URL</strong> is set to{" "}
                <code className="rounded bg-red-100 px-1 py-0.5 text-[10px]">{typeof window !== "undefined" ? window.location.origin : ""}/api/shopify/oauth/callback</code>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Store Domain</label>
              <div className="flex items-center rounded-xl border border-zinc-300 bg-zinc-50/50 transition-all focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 focus-within:bg-white">
                <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="your-store" className="flex-1 bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400" />
                <span className="pr-4 text-sm text-zinc-400">.myshopify.com</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!shop) return;
                track("connect_start", { from: "connect_page" });
                setBusy(true);
                window.location.href = `/api/shopify/oauth?shop=${shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`}`;
              }}
              disabled={!shop || busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5c8c2a] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#4a7322] hover:shadow-md disabled:opacity-50"
            >
              <Store className="h-4 w-4" />{busy ? "Connecting..." : "Connect with Shopify"}
            </button>
            <div className="flex items-start gap-2.5 rounded-xl bg-zinc-50/80 p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-xs text-zinc-500 leading-relaxed">We only request <strong className="text-zinc-600">read</strong> access to orders and <strong className="text-zinc-600">write</strong> access for returns. Your data stays secure.</p>
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-zinc-400">
          No store yet? <Link href="/demo" className="font-medium text-violet-600 transition-colors hover:text-violet-700 hover:underline">Try the demo first</Link>
        </p>
      </div>
    </div>
  );
}
