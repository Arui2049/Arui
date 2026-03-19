import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Auri",
};

export default function PrivacyPage() {
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
        <h1 className="mb-2 text-3xl font-bold text-zinc-900">Privacy Policy</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: March 18, 2026</p>

        <div className="prose prose-zinc prose-sm max-w-none [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_p]:text-zinc-600 [&_p]:leading-relaxed [&_ul]:text-zinc-600 [&_li]:leading-relaxed">
          <h2>1. Information We Collect</h2>
          <p>When you install Auri on your Shopify store, we access the following data through the Shopify API:</p>
          <ul>
            <li><strong>Order data</strong> (read-only): order numbers, item details, fulfillment and tracking status, and customer email addresses associated with those orders.</li>
            <li><strong>Return requests</strong> (write): we create return records on your behalf when a customer initiates a return through the chat widget.</li>
          </ul>
          <p>We do not collect payment information, passwords, or any data beyond the Shopify API scopes you authorize during installation (<code>read_orders</code>, <code>write_returns</code>).</p>

          <h2>2. How We Use Your Data</h2>
          <p>Your data is used solely to power the Auri chat experience:</p>
          <ul>
            <li>Looking up customer orders by email to display in-chat order cards.</li>
            <li>Creating return or exchange requests on the customer&apos;s behalf.</li>
            <li>Providing shipment tracking information.</li>
            <li>Generating usage analytics visible on your admin dashboard.</li>
          </ul>

          <h2>3. Data Storage &amp; Security</h2>
          <p>Your Shopify access token is encrypted at rest using AES-256-CBC. Session cookies are signed with HMAC-SHA256. All data is transmitted over HTTPS.</p>
          <p>We do not sell, rent, or share your data with third parties. Conversation data is processed by the AI language model configured in your settings and is not stored beyond the active chat session.</p>

          <h2>4. Data Retention</h2>
          <p>Ticket records and usage statistics are retained for the duration of your subscription. When you uninstall Auri, your store data and access tokens are permanently deleted from our systems.</p>

          <h2>5. Third-Party Services</h2>
          <p>Auri uses an AI language model provider (configurable) to generate chat responses. Messages sent to the AI model do not include your Shopify access token or any authentication credentials.</p>

          <h2>6. Your Rights</h2>
          <p>You may request a copy or deletion of your data at any time by contacting us. Uninstalling the app automatically triggers data deletion.</p>

          <h2>7. Contact</h2>
          <p>If you have questions about this privacy policy, please contact us at <a href="mailto:support@imauri.com" className="text-violet-600 hover:text-violet-700">support@imauri.com</a>.</p>
        </div>
      </article>
    </div>
  );
}
