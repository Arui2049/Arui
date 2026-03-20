# Auri

AI-powered return & exchange support widget for Shopify stores. Customers resolve returns, track shipments, and request exchanges directly inside a chat — no portals, no tickets.

## Features

- **A2UI (AI to UI)** — interactive order cards, exchange forms, and tracking timelines rendered inside the chat
- **Shopify Integration** — OAuth install, order lookup, return creation via Admin API
- **Configurable Policy Engine** — return window, conditions, language, tone
- **Usage Dashboard** — analytics, ticket history, and setup checklist
- **Human Escalation** — AI auto-escalates unresolvable cases with summary
- **Multi-LLM Support** — works with OpenAI, Arouter, OpenRouter, or any OpenAI-compatible provider

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials (see below)

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page. Visit `/demo` to try the chat widget.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_API_KEY` | Yes | App Client ID from Shopify Partners |
| `SHOPIFY_API_SECRET` | Yes | App Client Secret from Shopify Partners |
| `SHOPIFY_SCOPES` | No | Defaults to `read_orders,write_returns` |
| `APP_URL` | Yes | Your deployed domain (no trailing slash) |
| `SESSION_SECRET` | Yes | Random 64-char hex string for signing cookies & encrypting tokens |
| `LLM_API_KEY` | Yes | API key for your LLM provider |
| `LLM_BASE_URL` | No | Base URL for OpenAI-compatible providers (e.g. `https://api.arouter.ai/v1`) |
| `LLM_MODEL` | No | Model name, defaults to `gpt-4o-mini` |
| `OPENAI_API_KEY` | No | Legacy fallback if `LLM_API_KEY` is not set |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment

### Important: Data Persistence

Auri stores data in local JSON files (`.data/` directory). This means:

- **Vercel is NOT supported** — Serverless functions have a read-only, ephemeral filesystem. Data will be lost on every cold start.
- **Railway (recommended)** — Use a [Volume](https://docs.railway.app/reference/volumes) mounted at `/app/.data` for persistent storage.
- **Fly.io** — Use a [persistent volume](https://fly.io/docs/volumes/) mounted at the `.data` path.
- **VPS / Docker** — Mount a host directory to `.data` in your container.

### Deploy to Railway

1. Connect your GitHub repo to Railway
2. Add a Volume, mount path: `/app/.data`
3. Set all environment variables from `.env.example`
4. Deploy — Railway will auto-detect Next.js and run `npm run build && npm start`

### Shopify App Setup

1. Create a new app in [Shopify Partners](https://partners.shopify.com/)
2. Set the App URL to your deployed domain
3. Set the Allowed Redirection URL to `{APP_URL}/api/shopify/oauth/callback`
4. Set all GDPR mandatory webhook URLs to `{APP_URL}/api/shopify/webhooks`
5. Required scopes: `read_orders,write_returns`
6. Keep Embedded App disabled unless App Bridge/session token flow is implemented
7. Copy the Client ID and Client Secret to your `.env.local`
8. Install the app on a development store via `{APP_URL}/connect`

For App Store submission assets/checklist, see:
- `docs/SHOPIFY_APP_STORE_SUBMISSION_CHECKLIST.md`
- `docs/SHOPIFY_APP_STORE_LISTING_DRAFT.md`

## Project Structure

```
src/
  app/
    api/
      chat/          — AI chat endpoint (streaming SSE)
      shopify/       — OAuth & webhook handlers
      admin/         — Dashboard API routes
      widget/        — Widget embed, token, verify endpoints
    admin/           — Dashboard UI (usage, settings, tickets)
    connect/         — Store connection page
    demo/            — Demo chat (dual-mode: sample + live)
    privacy/         — Privacy policy
    terms/           — Terms of service
    widget/[shop]/   — Embeddable chat widget
  components/
    chat/            — ChatInterface + error boundary
    widgets/         — A2UI components (OrderList, ReturnConfirmation, StatusTracker, EscalationCard)
    admin/           — Dashboard components
  lib/
    billing/         — Multi-tier pricing, Shopify Billing API, usage tracking & overage
    shopify/         — Shopify API client & types
    crypto.ts        — HMAC, AES, session signing, widget tokens
    store.ts         — JSON file-based data persistence
    session.ts       — Cookie session helpers
```

## Theme App Extension (recommended install)

Auri includes a Theme App Extension under `extensions/auri-theme/` with an App Embed block handle `auri-embed`.
Merchants can enable it in:
Online Store → Themes → Customize → App embeds → **Auri chat widget**.

## License

Proprietary. All rights reserved.
