"use client";

import Link from "next/link";
import { ArrowRight, Package, RotateCcw, Truck, Zap, ShieldCheck, BarChart3, MessageSquare, CheckCircle2, Clock, Star, ArrowUpRight, ChevronRight } from "lucide-react";
import { track } from "@/lib/track-client";
import { HeroDemo } from "@/components/HeroDemo";

function Feature({ icon: Icon, title, desc, delay }: { icon: typeof Package; title: string; desc: string; delay: string }) {
  return (
    <div className={`group relative rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-100/50 hover:border-violet-200 animate-slide-up ${delay}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5 text-violet-600" />
      </div>
      <h3 className="mb-1.5 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="text-[13px] text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-zinc-900 sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Auri Logo" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-zinc-900">Auri</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="hidden text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 sm:block">Demo</Link>
            <Link href="/admin" className="hidden text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 sm:block">Dashboard</Link>
            <Link
              href="/connect"
              onClick={() => track("cta_click", { cta: "get_started", placement: "nav" })}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl animate-float" />
        <div className="absolute top-40 right-1/4 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl animate-float [animation-delay:3s]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: text */}
            <div className="text-center lg:text-left">
              <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-1.5 text-xs font-medium text-violet-700 backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5" />AI-Powered Returns & Order Tracking
                <ArrowUpRight className="h-3 w-3 opacity-50" />
              </div>
              <h1 className="animate-slide-up mb-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                Resolve Returns{" "}
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Inside the Chat
                </span>
              </h1>
              <p className="animate-slide-up stagger-1 mx-auto mb-10 max-w-xl text-base text-zinc-500 leading-relaxed sm:text-lg lg:mx-0">
                No portals, no tickets. Auri renders interactive order cards, exchange forms, and tracking timelines directly in chat.
              </p>
              <div className="animate-slide-up stagger-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/demo" className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5">
                  Try Live Demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/connect"
                  onClick={() => track("cta_click", { cta: "connect_shopify", placement: "hero" })}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm"
                >
                  Connect Shopify
                </Link>
              </div>

              {/* Stats */}
              <div className="animate-slide-up stagger-3 mt-12 grid max-w-md grid-cols-3 gap-8 rounded-2xl border border-zinc-100 bg-zinc-50/50 px-6 py-5 backdrop-blur-sm mx-auto lg:mx-0">
                <Stat value="<60s" label="Avg Resolution" />
                <Stat value="0" label="Agents Needed" />
                <Stat value="50+" label="Free Tickets/mo" />
              </div>
            </div>

            {/* Right: animated demo */}
            <div className="hidden lg:flex justify-center animate-scale-in stagger-2">
              <HeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="border-y border-zinc-100 bg-gradient-to-b from-zinc-50 to-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="animate-slide-up mb-3 text-center text-xs font-semibold uppercase tracking-widest text-violet-600">Before vs After</div>
          <h2 className="animate-slide-up stagger-1 mb-4 text-center text-2xl font-bold text-zinc-900 sm:text-3xl">No More Portals. No More Tickets.</h2>
          <p className="animate-slide-up stagger-2 mx-auto mb-12 max-w-lg text-center text-sm text-zinc-500">See how Auri transforms a frustrating 10-minute support experience into a 30-second conversation.</p>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Traditional */}
            <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100"><Clock className="h-4 w-4 text-red-500" /></div>
                <span className="text-sm font-semibold text-red-600">Traditional Support</span>
                <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">~10 min</span>
              </div>
              <div className="space-y-2">
                <div className="ml-6 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700"><span className="font-medium text-zinc-400">Customer: </span>I want to return my shoes</div>
                <div className="mr-6 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600"><span className="font-medium text-zinc-400">Bot: </span>Here&apos;s our return policy: <span className="text-blue-500 underline">returns.example.com</span></div>
                <div className="ml-6 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700"><span className="font-medium text-zinc-400">Customer: </span>Where do I go?</div>
                <div className="mr-6 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600"><span className="font-medium text-zinc-400">Bot: </span>Visit our returns portal and enter your order #</div>
                <div className="ml-6 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700"><span className="font-medium text-zinc-400">Customer: </span>What&apos;s my order number?</div>
                <div className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs italic text-red-400">... 10 minutes later, still stuck ...</div>
              </div>
            </div>

            {/* Auri — with real product images */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100"><Zap className="h-4 w-4 text-emerald-500" /></div>
                <span className="text-sm font-semibold text-emerald-600">Auri</span>
                <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-500">~30 sec</span>
              </div>
              <div className="space-y-2.5">
                <div className="ml-6 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700"><span className="font-medium text-zinc-400">Customer: </span>My sneakers are too small</div>

                {/* Mini order card with real images */}
                <div className="mr-4 rounded-lg border border-violet-200/60 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between bg-violet-50/50 px-3 py-1.5 border-b border-violet-100/60">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-violet-500" />
                      <span className="text-[10px] font-semibold text-violet-700">Order #1001</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700">Fulfilled</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 bg-violet-50/20">
                    <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop" alt="Sneakers" className="h-8 w-8 rounded-md object-cover ring-1 ring-violet-200/50" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-zinc-800 truncate">Classic Runner Sneakers</div>
                      <div className="text-[9px] text-zinc-400">White / Size 9 · $89.99</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-violet-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2 border-t border-zinc-100/50">
                    <img src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=200&h=200&fit=crop" alt="Socks" className="h-8 w-8 rounded-md object-cover ring-1 ring-zinc-200/50" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-zinc-800 truncate">Cotton Crew Socks (3-Pack)</div>
                      <div className="text-[9px] text-zinc-400">Black · $19.99</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0" />
                  </div>
                </div>

                <div className="ml-6 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700"><span className="font-medium text-zinc-400">Customer: </span>The sneakers</div>

                {/* Mini exchange confirmation */}
                <div className="mr-4 rounded-lg border border-emerald-200/60 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                    <span className="text-[10px] font-semibold text-white">Exchange Created — Size 10</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3">
                    <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop" alt="Sneakers" className="h-8 w-8 rounded-md object-cover ring-1 ring-emerald-200/50" />
                    <div className="flex-1 text-[10px] text-zinc-600 leading-relaxed">
                      Pack &amp; drop off at UPS within 14 days. Your new Size 10 ships once we receive the return.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Done! Return label generated.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile demo (shown below hero on smaller screens) */}
      <section className="lg:hidden border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-violet-600">Live Preview</div>
          <div className="flex justify-center">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-violet-600">Features</div>
          <h2 className="mb-4 text-center text-2xl font-bold text-zinc-900 sm:text-3xl">Everything Happens In-Chat</h2>
          <p className="mx-auto mb-14 max-w-lg text-center text-sm text-zinc-500">No external portals. No copy-pasting order numbers. Your customers resolve issues without ever leaving the conversation.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={Package} title="Order Lookup" desc="AI identifies the customer and renders their recent orders as interactive cards with images and status." delay="stagger-1" />
            <Feature icon={RotateCcw} title="Returns & Exchanges" desc="Native forms for selecting return reason, new size, and submitting — all rendered inside the chat." delay="stagger-2" />
            <Feature icon={Truck} title="Shipment Tracking" desc="Real-time tracking timeline with carrier info, progress bar, and delivery events at a glance." delay="stagger-3" />
            <Feature icon={ShieldCheck} title="Secure by Design" desc="Declarative A2UI protocol — no code injection, only pre-approved UI components render." delay="stagger-4" />
            <Feature icon={BarChart3} title="Usage Dashboard" desc="Track auto-resolved tickets, monitor costs, and see your ROI update in real-time." delay="stagger-5" />
            <Feature icon={MessageSquare} title="2-Step Resolution" desc="Most returns resolved in under 60 seconds. Zero human agents needed." delay="stagger-6" />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-zinc-100 bg-zinc-50/50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-3 flex justify-center gap-0.5">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
          </div>
          <blockquote className="mb-4 text-lg font-medium text-zinc-800 italic leading-relaxed">
            &ldquo;We used to spend 3 hours a day on returns. Now Auri handles 90% of them automatically. Our customers love the instant resolution.&rdquo;
          </blockquote>
          <div className="text-sm text-zinc-500">— Shopify Store Owner, 2000+ orders/month</div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-600">Pricing</div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 sm:text-3xl">Start Free. Scale as You Grow.</h2>
          <p className="mb-12 text-sm text-zinc-500">No credit card required. 14-day free trial on all paid plans.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="mb-1 text-sm font-semibold text-zinc-500">Free</div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-zinc-900">$0</span>
                <span className="text-zinc-400">/mo</span>
              </div>
              <p className="mb-6 text-[13px] text-zinc-500">Perfect for trying Auri out</p>
              <div className="mb-6 flex-1 space-y-2.5 text-left">
                {["50 AI tickets/month", "Order lookup & tracking", "Returns & exchanges", "Shopify integration", "Embeddable chat widget"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{f}
                  </div>
                ))}
              </div>
              <Link
                href="/connect"
                onClick={() => track("cta_click", { cta: "pricing_free", placement: "pricing" })}
                className="block w-full rounded-xl border border-zinc-200 bg-white py-3 text-center text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50"
              >
                Get Started
              </Link>
            </div>
            {/* Starter */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="mb-1 text-sm font-semibold text-violet-600">Starter</div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-zinc-900">$19</span>
                <span className="text-zinc-400">/mo</span>
              </div>
              <p className="mb-6 text-[13px] text-zinc-500">For small stores getting started</p>
              <div className="mb-6 flex-1 space-y-2.5 text-left">
                {["200 AI tickets/month", "Everything in Free", "Usage dashboard", "14-day free trial"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{f}
                  </div>
                ))}
              </div>
              <Link
                href="/connect"
                onClick={() => track("cta_click", { cta: "pricing_starter", placement: "pricing" })}
                className="block w-full rounded-xl border border-zinc-200 bg-white py-3 text-center text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50"
              >
                Start Free Trial
              </Link>
            </div>
            {/* Growth — highlighted */}
            <div className="relative flex flex-col rounded-2xl border-2 border-violet-400 bg-white p-6 shadow-lg shadow-violet-100/50 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-[11px] font-semibold text-white shadow-sm">Most Popular</div>
              <div className="mb-1 text-sm font-semibold text-violet-600">Growth</div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-zinc-900">$49</span>
                <span className="text-zinc-400">/mo</span>
              </div>
              <p className="mb-6 text-[13px] text-zinc-500">For growing stores with volume</p>
              <div className="mb-6 flex-1 space-y-2.5 text-left">
                {["1,000 AI tickets/month", "Everything in Starter", "$0.06/extra ticket", "Overage capped at $149", "14-day free trial"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{f}
                  </div>
                ))}
              </div>
              <Link
                href="/connect"
                onClick={() => track("cta_click", { cta: "pricing_growth", placement: "pricing" })}
                className="block w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:shadow-lg hover:shadow-violet-300 hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>
            {/* Pro */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="mb-1 text-sm font-semibold text-zinc-800">Pro</div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-zinc-900">$99</span>
                <span className="text-zinc-400">/mo</span>
              </div>
              <p className="mb-6 text-[13px] text-zinc-500">For high-volume stores</p>
              <div className="mb-6 flex-1 space-y-2.5 text-left">
                {["3,000 AI tickets/month", "Everything in Growth", "$0.04/extra ticket", "Overage capped at $249", "14-day free trial"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{f}
                  </div>
                ))}
              </div>
              <Link
                href="/connect"
                onClick={() => track("cta_click", { cta: "pricing_pro", placement: "pricing" })}
                className="block w-full rounded-xl border border-zinc-900 bg-zinc-900 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="mb-3 text-2xl font-bold text-zinc-900 sm:text-3xl">Ready to Automate Your Returns?</h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-zinc-500">Set up in under 5 minutes. No coding required. Just connect your Shopify store and paste one line of code.</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/connect"
              onClick={() => track("cta_click", { cta: "connect_your_store", placement: "final_cta" })}
              className="group flex items-center gap-2 rounded-xl bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:-translate-y-0.5"
            >
              Connect Your Store
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/demo" className="text-sm font-medium text-zinc-500 hover:text-violet-600 transition-colors">
              or try the demo first →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100 bg-zinc-50/50 py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Auri Logo" className="h-6 w-6" />
            <span className="text-sm font-semibold text-zinc-700">Auri</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-zinc-400 transition-colors hover:text-zinc-600">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-zinc-400 transition-colors hover:text-zinc-600">Terms of Service</Link>
            <span className="text-xs text-zinc-300">&middot;</span>
            <p className="text-xs text-zinc-400">Built for Shopify</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
