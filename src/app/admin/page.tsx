"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, MessageSquare, Store, DollarSign, TrendingUp, Copy, Check, ExternalLink, AlertTriangle, Code, LogOut, Info, ArrowRight, Ticket, Settings } from "lucide-react";
import { SetupChecklist } from "@/components/admin/SetupChecklist";
import { InstallGuide } from "@/components/admin/InstallGuide";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { track } from "@/lib/track-client";

interface DailyCount { date: string; count: number }
interface TypeBreakdown { type: string; count: number }
interface Usage { shop: string; month: string; ticketCount: number; freeRemaining: number; overageCount: number; overageCostDisplay: string; envWarnings?: string[]; apiKeyConfigured?: boolean; hasTestTicket?: boolean; widgetInstalled?: boolean; dailyCounts?: DailyCount[]; typeBreakdown?: TypeBreakdown[]; resolvedRate?: number }
interface EventDay { date: string; count: number }
interface TopSource { source: string; count: number }
interface Acquisition {
  shop: string;
  pageViews14d: EventDay[];
  connectStarts14d: EventDay[];
  connectSuccess14d: EventDay[];
  topSources30d: TopSource[];
}

interface ReviewStatus {
  eligible: boolean;
  reviewUrl: string;
  reason: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof BarChart3; label: string; value: string | number; sub?: string; color: string }) {
  const palettes: Record<string, { bg: string; icon: string }> = {
    violet: { bg: "from-violet-50 to-indigo-50/50", icon: "bg-violet-100 text-violet-600" },
    emerald: { bg: "from-emerald-50 to-green-50/50", icon: "bg-emerald-100 text-emerald-600" },
    amber: { bg: "from-amber-50 to-orange-50/50", icon: "bg-amber-100 text-amber-600" },
    blue: { bg: "from-blue-50 to-sky-50/50", icon: "bg-blue-100 text-blue-600" },
    red: { bg: "from-red-50 to-rose-50/50", icon: "bg-red-100 text-red-600" },
  };
  const p = palettes[color] || palettes.violet;
  return (
    <div className={`rounded-2xl border border-zinc-200/60 bg-gradient-to-br ${p.bg} p-5 transition-all hover:shadow-md hover:shadow-zinc-100`}>
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${p.icon}`}><Icon className="h-4.5 w-4.5" /></div>
        <span className="text-xs font-medium text-zinc-500">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight text-zinc-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-400">{sub}</div>}
    </div>
  );
}

function EmbedCodeCard({ shop }: { shop: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const code = `<script src="${origin}/api/widget/embed?shop=${encodeURIComponent(shop)}"></script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100"><Code className="h-4 w-4 text-violet-600" /></div>
          <h2 className="text-sm font-semibold text-zinc-900">Widget Embed Code</h2>
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300">
          {copied ? <><Check className="h-3 w-3 text-emerald-500" />Copied!</> : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Paste this before <code className="rounded bg-zinc-100 px-1 py-0.5 text-[10px]">&lt;/body&gt;</code> in your Shopify theme to add the chat widget.
      </p>
      <pre className="rb-scrollbar overflow-x-auto rounded-xl bg-zinc-900 p-4 text-[11px] text-emerald-400 leading-relaxed shadow-inner">
        <code>{code}</code>
      </pre>
      <div className="mt-3 flex items-center gap-4">
        <Link href={`/widget/${encodeURIComponent(shop)}`} target="_blank" className="group inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 transition-colors hover:text-violet-800">
          <ExternalLink className="h-3 w-3" />Test widget
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [u, setU] = useState<Usage | null>(null);
  const [acq, setAcq] = useState<Acquisition | null>(null);
  const [review, setReview] = useState<ReviewStatus | null>(null);
  const [hideReview, setHideReview] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const reviewShownOnce = useRef(false);

  useEffect(() => {
    fetch("/api/admin/usage")
      .then((r) => {
        if (r.status === 401) { router.push("/connect"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setU(data); })
      .catch(() => setLoadError(true));
  }, [router]);

  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setAcq(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/review")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setReview({ eligible: !!data.eligible, reviewUrl: String(data.reviewUrl || ""), reason: String(data.reason || "") });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!review?.eligible || reviewShownOnce.current) return;
    reviewShownOnce.current = true;
    fetch("/api/admin/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "shown" }) }).catch(() => {});
    track("review_prompt_shown");
  }, [review?.eligible]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connect");
  };

  const pct = u ? Math.min(100, (u.ticketCount / 50) * 100) : 0;
  const limitReached = u ? u.freeRemaining <= 0 : false;
  const nearLimit = u ? u.freeRemaining > 0 && u.freeRemaining <= 10 : false;
  const pv14 = acq?.pageViews14d?.reduce((s, d) => s + d.count, 0) ?? 0;
  const cs14 = acq?.connectStarts14d?.reduce((s, d) => s + d.count, 0) ?? 0;
  const ok14 = acq?.connectSuccess14d?.reduce((s, d) => s + d.count, 0) ?? 0;

  if (loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <div className="animate-scale-in text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100"><Info className="h-5 w-5 text-zinc-400" /></div>
          <p className="text-sm font-medium text-zinc-700">Failed to load dashboard</p>
          <p className="mt-1 text-xs text-zinc-400">Please check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-violet-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Auri Logo" className="h-7 w-7" />
              <span className="text-sm font-bold text-zinc-900">Auri</span>
            </Link>
            <span className="hidden text-zinc-300 sm:inline">/</span>
            <span className="hidden text-sm font-medium text-zinc-600 sm:inline">Dashboard</span>
            {u?.shop && <span className="hidden rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 sm:inline">{u.shop}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/tickets" className="hidden rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300 sm:flex items-center gap-1.5">
              <Ticket className="h-3 w-3" />Tickets
            </Link>
            <Link href="/admin/settings" className="hidden rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300 sm:flex items-center gap-1.5">
              <Settings className="h-3 w-3" />Settings
            </Link>
            <Link href="/demo" className="hidden rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300 sm:flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />Demo
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-700">
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Env warnings */}
        {u?.envWarnings && u.envWarnings.length > 0 && (
          <div className="animate-slide-down mb-6 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Info className="h-4 w-4" />Configuration
            </div>
            {u.envWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700">{w}</p>
            ))}
          </div>
        )}

        {/* Setup checklist */}
        {u && (
          <SetupChecklist
            storeConnected={!!u.shop}
            apiKeyConfigured={!!u.apiKeyConfigured}
            widgetInstalled={!!u.widgetInstalled}
            hasTestTicket={!!u.hasTestTicket}
          />
        )}

        {/* Review prompt (automated) */}
        {review?.eligible && !hideReview && (
          <div className="animate-slide-down mb-6 flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-green-50/50 p-4 shadow-sm">
            <Info className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-emerald-900">Enjoying Auri?</div>
              <p className="text-xs text-emerald-700">A quick review helps us rank higher and brings you faster updates.</p>
            </div>
            <a
              href={review.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                fetch("/api/admin/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clicked" }) }).catch(() => {});
                track("review_prompt_clicked");
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-md"
            >
              Leave a review
            </a>
            <button
              type="button"
              onClick={() => {
                setHideReview(true);
                fetch("/api/admin/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismissed" }) }).catch(() => {});
                track("review_prompt_dismissed");
              }}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-50"
            >
              Later
            </button>
          </div>
        )}

        {/* Limit banners */}
        {limitReached && (
          <div className="animate-slide-down mb-6 flex items-center gap-3 rounded-xl border border-red-200/60 bg-gradient-to-r from-red-50 to-rose-50/50 p-4 shadow-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-800">Free tier limit reached</div>
              <p className="text-xs text-red-600">Your 50 free tickets have been used. Upgrade to continue serving customers.</p>
            </div>
            <a href="mailto:support@imauri.com?subject=Auri%20Upgrade%20Request" className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-red-700 hover:shadow-md">Contact to Upgrade</a>
          </div>
        )}
        {nearLimit && !limitReached && (
          <div className="animate-slide-down mb-6 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800">Approaching limit</div>
              <p className="text-xs text-amber-600">{u?.freeRemaining} free tickets remaining this month.</p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={MessageSquare} label="Tickets" value={u?.ticketCount ?? "—"} sub="This month" color="violet" />
          <StatCard icon={BarChart3} label="Free Remaining" value={u?.freeRemaining ?? "—"} sub="of 50 included" color={limitReached ? "red" : nearLimit ? "amber" : "emerald"} />
          <StatCard icon={DollarSign} label="Overage" value={u?.overageCostDisplay ?? "$0.00"} sub={`${u?.overageCount ?? 0} extra tickets`} color="amber" />
          <StatCard icon={TrendingUp} label="Avg Resolution" value="~2 min" sub="AI-powered" color="blue" />
        </div>

        {/* Usage bar */}
        <div className="mb-6 rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Monthly Usage</h2>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">{u?.month}</span>
          </div>
          <div className="mb-2.5 h-3 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${limitReached ? "bg-gradient-to-r from-red-500 to-rose-500" : pct > 80 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-violet-500 to-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{u?.ticketCount ?? 0} / 50 free tickets used</span>
            {(u?.overageCount ?? 0) > 0 && <span className="font-medium text-amber-600">+{u?.overageCount} overage</span>}
          </div>
        </div>

        {/* Acquisition (automated) */}
        {acq && (
          <div className="mb-6 rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-zinc-900">Acquisition</h2>
                <p className="text-[11px] text-zinc-400">Auto-tracked via UTM + events</p>
              </div>
              <div className="hidden items-center gap-2 text-[11px] text-zinc-500 sm:flex">
                <span className="rounded-md bg-zinc-100 px-2 py-0.5">PV 14d: <span className="font-semibold text-zinc-700">{pv14}</span></span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5">Start 14d: <span className="font-semibold text-zinc-700">{cs14}</span></span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5">Success 14d: <span className="font-semibold text-zinc-700">{ok14}</span></span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4">
                <div className="mb-2 text-xs font-semibold text-zinc-700">Top sources (30d)</div>
                {acq.topSources30d.length === 0 ? (
                  <div className="text-xs text-zinc-400">No attribution data yet.</div>
                ) : (
                  <div className="space-y-2">
                    {acq.topSources30d.map((s) => (
                      <div key={s.source} className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate text-xs text-zinc-600">{s.source}</div>
                        <div className="shrink-0 rounded-md border border-zinc-200/60 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700">{s.count}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <a className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-600 hover:bg-zinc-50" href="/api/admin/export?kind=events&format=csv">
                    Export events CSV
                  </a>
                  <a className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-600 hover:bg-zinc-50" href="/api/admin/export?kind=tickets&format=csv">
                    Export tickets CSV
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4">
                <div className="mb-2 text-xs font-semibold text-zinc-700">自动优化建议</div>
                <ul className="space-y-1 text-[11px] text-zinc-500">
                  <li>- PV 低：上程序化 SEO 页面 + sitemap。</li>
                  <li>- PV 高但 Start 低：CTA 更明确，减少跳转与文案摩擦。</li>
                  <li>- Start 高但 Success 低：优化 OAuth 信任与权限说明。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Embed code + install guide */}
          {u?.shop && (
            <div>
              <EmbedCodeCard shop={u.shop} />
              <InstallGuide />
            </div>
          )}

          {/* Store connection */}
          <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100"><Store className="h-4 w-4 text-emerald-600" /></div>
              <h2 className="text-sm font-semibold text-zinc-900">Store Connection</h2>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50/80 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100">
                <Store className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900">{u?.shop || "—"}</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Connected
                </div>
              </div>
              <Link href="/connect" className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50">Manage</Link>
            </div>

            {/* Pricing info */}
            <div className="mt-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50/50 p-4">
              <h3 className="mb-2 text-xs font-semibold text-violet-800">Plan Details</h3>
              <div className="space-y-1.5 text-[11px] text-violet-700">
                <div className="flex justify-between"><span>Free tier</span><span className="font-semibold">50 tickets/mo</span></div>
                <div className="flex justify-between"><span>Overage rate</span><span className="font-semibold">$0.15/ticket</span></div>
                <div className="flex justify-between"><span>Pro plan</span><span className="font-medium text-violet-500">Coming soon</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics charts */}
        {u && (
          <AnalyticsCharts
            dailyCounts={u.dailyCounts || []}
            typeBreakdown={u.typeBreakdown || []}
            resolvedRate={u.resolvedRate ?? 100}
          />
        )}
      </div>
    </div>
  );
}
