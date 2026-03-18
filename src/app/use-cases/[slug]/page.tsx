import Link from "next/link";
import type { Metadata } from "next";
import { USE_CASES } from "@/lib/seo/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return USE_CASES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = USE_CASES.find((x) => x.slug === slug);
  if (!p) return { title: "Use case — Auri" };
  return {
    title: `${p.title} — Auri`,
    description: p.description,
    alternates: { canonical: `/use-cases/${p.slug}` },
  };
}

export default async function UseCasePage({ params }: Props) {
  const { slug } = await params;
  const p = USE_CASES.find((x) => x.slug === slug);
  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">Not found</h1>
        <p className="mt-2 text-sm text-zinc-500">This page does not exist.</p>
        <Link className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" href="/">Back</Link>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-violet-600">Use case</div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{p.title}</h1>
        <p className="mt-3 text-base text-zinc-600 leading-relaxed">{p.description}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { title: "Automate common questions", desc: "Instantly resolve order status, tracking, returns, and exchanges without human agents." },
            { title: "Keep customers on-site", desc: "No external portals. Everything happens in chat with interactive order cards." },
            { title: "Reduce support load", desc: "Fewer tickets and faster resolution means lower CAC payback and higher NPS." },
            { title: "Measure ROI automatically", desc: "Track tickets resolved and usage in your dashboard with no manual reporting." },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-zinc-200/70 bg-zinc-50/40 p-5">
              <div className="text-sm font-semibold text-zinc-900">{b.title}</div>
              <div className="mt-1 text-sm text-zinc-600 leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-indigo-50/40 p-6">
          <div className="text-sm font-semibold text-violet-900">Ready to try it on your store?</div>
          <p className="mt-1 text-sm text-violet-700">Connect Shopify, paste one script, and start resolving returns inside chat.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/connect" className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white">
              Connect Shopify
            </Link>
            <Link href="/demo" className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-700">
              Try the demo
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

