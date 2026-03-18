import Link from "next/link";
import type { Metadata } from "next";
import { COMPETITORS } from "@/lib/seo/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return COMPETITORS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = COMPETITORS.find((x) => x.slug === slug);
  if (!p) return { title: "Compare — Auri" };
  return {
    title: `${p.title}`,
    description: p.description,
    alternates: { canonical: `/compare/${p.slug}` },
  };
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const p = COMPETITORS.find((x) => x.slug === slug);
  if (!p) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">Not found</h1>
        <p className="mt-2 text-sm text-zinc-500">This page does not exist.</p>
        <Link className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" href="/">Back</Link>
      </div>
    );
  }

  const rows = [
    { k: "Primary UX", a: "In-chat resolution (interactive UI cards)", b: "Portal-first workflow" },
    { k: "Ticket reduction", a: "Designed to reduce tickets (AI handles the flow)", b: "Often still generates support tickets" },
    { k: "Time-to-value", a: "Connect + paste 1 script", b: "Theme/portal setup + configuration" },
    { k: "Best for", a: "Stores that want less support overhead", b: "Stores optimizing returns portal experience" },
  ];

  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-violet-600">Comparison</div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{p.title}</h1>
        <p className="mt-3 text-base text-zinc-600 leading-relaxed">{p.description}</p>

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200/70">
          <div className="grid grid-cols-3 bg-zinc-50/60 px-5 py-3 text-xs font-semibold text-zinc-700">
            <div>Feature</div>
            <div>Auri</div>
            <div className="text-zinc-500">Alternative</div>
          </div>
          {rows.map((r) => (
            <div key={r.k} className="grid grid-cols-3 gap-4 border-t border-zinc-200/70 px-5 py-4 text-sm">
              <div className="font-medium text-zinc-900">{r.k}</div>
              <div className="text-zinc-700">{r.a}</div>
              <div className="text-zinc-500">{r.b}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-indigo-50/40 p-6">
          <div className="text-sm font-semibold text-violet-900">Try Auri on your store</div>
          <p className="mt-1 text-sm text-violet-700">Install in minutes and let customers resolve returns without portals.</p>
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

