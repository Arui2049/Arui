import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Auri",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-white">
      <nav className="sticky top-0 z-50 border-b border-zinc-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Auri Logo" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-zinc-900">Auri</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900">Terms of Service</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: March 18, 2026</p>

        <div className="prose prose-zinc prose-sm max-w-none [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_p]:text-zinc-600 [&_p]:leading-relaxed [&_ul]:text-zinc-600 [&_li]:leading-relaxed">
          <h2>1. Acceptance of Terms</h2>
          <p>By installing or using Auri (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, please uninstall the application.</p>

          <h2>2. Description of Service</h2>
          <p>Auri is an AI-powered customer support widget for Shopify stores that helps process return and exchange requests, look up orders, and provide shipment tracking — all within an in-chat experience.</p>

          <h2>3. Free Tier &amp; Pricing</h2>
          <p>Each store receives 50 free AI-resolved tickets per calendar month. Usage beyond the free tier is billed at $0.15 per ticket. Pricing is subject to change with 30 days&apos; notice.</p>

          <h2>4. Your Responsibilities</h2>
          <ul>
            <li>You are responsible for ensuring your store&apos;s return policy is accurately configured in the Auri settings.</li>
            <li>You are responsible for monitoring escalated tickets that require human attention.</li>
            <li>You must not use the Service for any illegal or unauthorized purpose.</li>
          </ul>

          <h2>5. AI-Generated Responses</h2>
          <p>Auri uses AI language models to generate responses. While we strive for accuracy, AI responses may occasionally be incorrect. You acknowledge that Auri is a support tool and not a substitute for human judgment on complex cases.</p>

          <h2>6. Data &amp; Privacy</h2>
          <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-violet-600 hover:text-violet-700">Privacy Policy</Link>. We access only the Shopify API scopes you authorize.</p>

          <h2>7. Service Availability</h2>
          <p>We aim for high availability but do not guarantee uninterrupted service. We are not liable for any losses resulting from downtime or AI response errors.</p>

          <h2>8. Termination</h2>
          <p>You may terminate your use of Auri at any time by uninstalling the app from your Shopify store. We may suspend or terminate accounts that violate these terms.</p>

          <h2>9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Auri shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

          <h2>10. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>

          <h2>11. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:support@imauri.com" className="text-violet-600 hover:text-violet-700">support@imauri.com</a>.</p>
        </div>
      </article>
    </div>
  );
}
