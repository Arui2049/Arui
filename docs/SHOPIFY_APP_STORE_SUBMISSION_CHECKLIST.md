# Shopify App Store Submission Checklist (Auri)

This checklist is tailored to the current production environment:
- App URL: `https://app.imauri.com`
- OAuth callback: `https://app.imauri.com/api/shopify/oauth/callback`
- Webhook endpoint: `https://app.imauri.com/api/shopify/webhooks`
- Shopify API version: `2026-01` (supported until Jan 2027)

---

## 1) Partner Dashboard Configuration

- [ ] App URL is set to `https://app.imauri.com`
- [ ] Allowed redirection URL includes only:
  - `https://app.imauri.com/api/shopify/oauth/callback`
- [ ] Embedded app is OFF (standalone app mode)
- [ ] Required scopes include:
  - `read_orders,write_returns`
- [ ] Optional scopes are empty (unless explicitly needed)
- [ ] GDPR mandatory webhooks are all set to:
  - `https://app.imauri.com/api/shopify/webhooks`
    - customer data request
    - customer data erasure
    - shop data erasure

## 2) Compliance & Legal Pages

- [x] Privacy policy page implemented: `/privacy`
- [x] Terms of service page implemented: `/terms`
- [ ] Privacy policy URL is live: `https://app.imauri.com/privacy`
- [ ] Terms of service URL is live: `https://app.imauri.com/terms`
- [ ] Support contact email (`support@imauri.com`) is configured and monitored

## 3) GDPR Compliance (Code)

- [x] `customers/data_request` — exports all customer ticket data and stores in GDPR records
- [x] `customers/redact` — deletes all customer tickets by email match
- [x] `shop/redact` — removes all shop data including GDPR request records containing PII
- [x] `app/uninstalled` — removes shop record and usage data
- [x] GDPR data exports viewable by merchants via `GET /api/admin/gdpr`

## 4) Security (Code)

- [x] OAuth HMAC verification (timing-safe)
- [x] Webhook HMAC verification (timing-safe)
- [x] Session cookie signing with HMAC (timing-safe in both Node.js and Edge runtime)
- [x] Access tokens encrypted with AES-256-CBC when `SESSION_SECRET` is set
- [x] Widget tokens use daily HMAC with yesterday grace period
- [x] Webhook registration failures are logged with status codes

## 5) Functional Validation (must pass before submit)

- [ ] Install app from OAuth link and land on `/admin`
- [ ] `/connect` can reconnect store without `redirect_uri` errors
- [ ] `/demo` chat returns AI responses
- [ ] Widget embed script loads on merchant storefront
- [ ] Widget token + verify + heartbeat endpoints work
- [ ] `app/uninstalled` webhook removes shop data
- [ ] All 3 GDPR webhooks return 200 for valid signed requests
- [ ] `GET /api/admin/gdpr` returns GDPR request history

## 6) Deployment Requirements

- [ ] Deployed on a platform with persistent storage (Railway / Fly.io / Render)
  - `.data/` directory mounted to persistent volume
  - **Cannot use Vercel** (serverless, no persistent filesystem)
- [ ] `SESSION_SECRET` is set (required for token encryption)
- [ ] `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are set
- [ ] `APP_URL` is set to `https://app.imauri.com`
- [ ] `LLM_API_KEY` or `OPENAI_API_KEY` is set for AI chat

## 7) App Listing Assets

- [ ] App icon (1200×1200 PNG)
- [ ] At least 3 screenshots (recommended 1600×900)
- [ ] Short description (≤ 100 chars)
- [ ] Full description with key outcomes
- [ ] Optional product video URL
- [ ] Pricing section consistent with in-app behavior:
  - Free: $0/mo, 50 tickets (hard limit)
  - Starter: $19/mo, 200 tickets (hard limit, 14-day trial)
  - Growth: $49/mo, 1,000 tickets + $0.06/ticket overage capped at $149/mo (14-day trial)
  - Pro: $99/mo, 3,000 tickets + $0.04/ticket overage capped at $249/mo (14-day trial)

## 8) Reviewer Notes

Provide clear test steps in the review notes:
- Install flow (OAuth link → `/admin`)
- How to trigger chat (widget embed or `/demo`)
- Where to see admin usage / settings / tickets
- Any feature flags or demo constraints

## 9) Post-Submission Monitoring

- [ ] Track webhook errors in server logs (`[Webhook]` and `[GDPR]` prefixes)
- [ ] Track OAuth failures (`/connect?error=...`)
- [ ] Keep response time stable on `app.imauri.com`
- [ ] Prepare a fast hotfix path for reviewer feedback
