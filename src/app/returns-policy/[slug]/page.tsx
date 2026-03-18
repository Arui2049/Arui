import Link from "next/link";
import type { Metadata } from "next";
import { RETURN_POLICY_TEMPLATES } from "@/lib/seo/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return RETURN_POLICY_TEMPLATES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = RETURN_POLICY_TEMPLATES.find((x) => x.slug === slug);
  if (!p) return { title: "Return policy template — Auri" };
  return {
    title: `${p.title} — Auri`,
    description: p.description,
    alternates: { canonical: `/returns-policy/${p.slug}` },
  };
}

function TemplateBody({ slug }: { slug: string }) {
  const common = [
    { h: "Return window", t: "We accept returns within 30 days of delivery (unless noted otherwise)." },
    { h: "Eligibility", t: "Items must be unused, with original packaging (and tags attached when applicable)." },
    { h: "Exchanges", t: "Size/color exchanges are supported when inventory is available." },
    { h: "Refund timeline", t: "Refunds are issued to the original payment method after inspection." },
    { h: "Damaged / wrong item", t: "Contact us within 48 hours with photos and we’ll make it right." },
  ];
  const extra =
    slug === "beauty-hygiene"
      ? [{ h: "Hygiene exception", t: "Opened personal care items may be non-returnable unless damaged or incorrect." }]
      : slug === "international-returns"
        ? [{ h: "International notes", t: "International return shipping and duties/taxes are typically non-refundable." }]
        : [];

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Copy-paste template</div>
        <div className="mt-3 space-y-4 text-sm text-zinc-700 leading-relaxed">
          <p><strong>Returns</strong></p>
          {(common.concat(extra)).map((s) => (
            <p key={s.h}>
              <strong>{s.h}:</strong> {s.t}
            </p>
          ))}
          <p><strong>How to start a return:</strong> Use our chat widget to look up your order and submit a return in under 60 seconds.</p>
          <p><strong>Contact:</strong> If you have questions, reply to this chat or email support.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-indigo-50/40 p-6">
        <div className="text-sm font-semibold text-violet-900">Want this policy to run itself?</div>
        <p className="mt-1 text-sm text-violet-700">Auri enforces your return window and conditions automatically inside chat.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/connect" className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-center text-sm font-semibold text-white">
            Connect Shopify
          </Link>
          <Link href="/admin/settings" className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-700">
            Configure policy in settings
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ReturnPolicyTemplatePage({ params }: Props) {
  const { slug } = await params;
  const p = RETURN_POLICY_TEMPLATES.find((x) => x.slug === slug);
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
        <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-violet-600">Return policy template</div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{p.title}</h1>
        <p className="mt-3 text-base text-zinc-600 leading-relaxed">{p.description}</p>
        <TemplateBody slug={slug} />
      </div>
    </main>
  );
}

