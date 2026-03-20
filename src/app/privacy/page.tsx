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
        <p className="mb-10 text-sm text-zinc-400">Last updated: March 19, 2026</p>

        <div className="prose prose-zinc prose-sm max-w-none [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_p]:text-zinc-600 [&_p]:leading-relaxed [&_ul]:text-zinc-600 [&_li]:leading-relaxed">
          <h2>1. Information We Collect</h2>
          <p>When you install Auri on your Shopify store, we access the following data through the Shopify API:</p>
          <ul>
            <li><strong>Order data</strong> (read-only): order numbers, item details, fulfillment and tracking status, and customer email addresses associated with those orders.</li>
            <li><strong>Return requests</strong> (write): we create return records on your behalf when a customer initiates a return through the chat widget.</li>
            <li><strong>Customer email addresses</strong>: collected from customers who interact with the chat widget, used solely to associate support tickets with the correct customer record.</li>
          </ul>
          <p>We collect only the minimum data required to provide the service. We do not collect payment information, passwords, or any data beyond the Shopify API scopes you authorize during installation (<code>read_orders</code>, <code>write_returns</code>).</p>

          <h2>2. How We Use Your Data</h2>
          <p>Your data is used solely to power the Auri chat experience:</p>
          <ul>
            <li>Looking up customer orders by email to display in-chat order cards.</li>
            <li>Creating return or exchange requests on the customer&apos;s behalf.</li>
            <li>Providing shipment tracking information.</li>
            <li>Generating usage analytics visible on your admin dashboard.</li>
          </ul>
          <p>We do not use customer data for automated decision-making with legal or significant effects. We do not sell, rent, or share customer data with third parties.</p>

          <h2>3. Data Storage &amp; Security</h2>
          <p>We implement the following security measures to protect your data:</p>
          <ul>
            <li><strong>Encryption at rest</strong>: Shopify access tokens and customer email addresses stored in support tickets are encrypted using AES-256-CBC.</li>
            <li><strong>Encryption in transit</strong>: All data is transmitted over HTTPS/TLS.</li>
            <li><strong>Session security</strong>: Session cookies are signed with HMAC-SHA256 using a constant-time comparison to prevent timing attacks.</li>
            <li><strong>Access control</strong>: All admin endpoints are protected by session authentication. Customer data access is logged for audit purposes.</li>
            <li><strong>Webhook integrity</strong>: All Shopify webhooks are verified using HMAC-SHA256 signature validation before processing.</li>
          </ul>
          <p>Test and production environments are kept strictly separate. Access to customer data is limited to authorized personnel only.</p>

          <h2>4. Data Retention</h2>
          <p>Support ticket records and usage statistics are retained for the duration of your active subscription. When you uninstall Auri, a <code>shop/redact</code> webhook is triggered and all your store data — including tickets, settings, access tokens, and GDPR request records — is permanently and irreversibly deleted from our systems within 48 hours.</p>

          <h2>5. GDPR &amp; Privacy Rights</h2>
          <p>We support the following GDPR mandatory webhooks as required by Shopify:</p>
          <ul>
            <li><strong>Customer data request</strong>: Upon request, we export all data associated with a customer and make it available for merchant review.</li>
            <li><strong>Customer data erasure</strong>: We permanently delete all support tickets and records associated with the specified customer email.</li>
            <li><strong>Shop data erasure</strong>: We permanently delete all data associated with your store, including customer records.</li>
          </ul>
          <p>You may also request a copy or deletion of your data at any time by contacting us at <a href="mailto:support@imauri.com" className="text-violet-600 hover:text-violet-700">support@imauri.com</a>.</p>

          <h2>6. Third-Party Services</h2>
          <p>Auri uses an AI language model provider (configurable via your admin settings) to generate chat responses. Chat messages are transmitted to the AI provider for response generation and are not stored beyond the active session. Your Shopify access token and authentication credentials are never sent to the AI provider.</p>

          <h2>7. Security Incident Response</h2>
          <p>In the event of a security incident or data breach, we will:</p>
          <ul>
            <li>Assess the scope and severity of the incident within 24 hours of discovery.</li>
            <li>Notify affected merchants by email within 72 hours if personal data may have been compromised.</li>
            <li>Take immediate steps to contain and remediate the incident, including revoking affected credentials and patching vulnerabilities.</li>
            <li>Provide a written incident report upon request, including the nature of the breach, data affected, and corrective actions taken.</li>
            <li>Cooperate with relevant data protection authorities as required by applicable law.</li>
          </ul>
          <p>To report a security vulnerability or incident, contact us immediately at <a href="mailto:support@imauri.com" className="text-violet-600 hover:text-violet-700">support@imauri.com</a>.</p>

          <h2>8. Contact</h2>
          <p>If you have questions about this privacy policy or wish to exercise your data rights, please contact us at <a href="mailto:support@imauri.com" className="text-violet-600 hover:text-violet-700">support@imauri.com</a>.</p>
        </div>
      </article>
    </div>
  );
}
