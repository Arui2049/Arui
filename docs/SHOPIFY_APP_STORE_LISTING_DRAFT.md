# Shopify App Store Listing Draft (Auri)

Use this as a starting point for the App Listing form.

## App Name

Auri

## Tagline / Short description (option A)

AI returns and order tracking support for Shopify stores.

## Tagline / Short description (option B)

Resolve returns in chat and reduce support tickets with AI.

## Full Description

Auri helps Shopify merchants handle returns and order tracking faster with an AI assistant.

Key capabilities:
- Let shoppers start return or exchange requests in chat.
- Answer order tracking questions instantly.
- Reduce repetitive support load with automated flows.
- Give merchants a simple dashboard for usage and support visibility.

What merchants can do with Auri:
- Connect their Shopify store in minutes.
- Add the chat widget to storefront with one script.
- Let customers self-serve common support tasks.
- Monitor ticket volume and trends in the admin dashboard.

Best for:
- Brands receiving frequent return or "where is my order" questions.
- Teams that want faster first response with less manual effort.

## Primary Category Suggestion

Customer support

## Secondary Category Suggestion

Returns and exchanges

## Support

- Support email: `support@imauri.com`
- Privacy policy: `https://app.imauri.com/privacy`
- Terms of service: `https://app.imauri.com/terms`

## Reviewer Test Notes (template)

1. Install app and complete OAuth.
2. You will be redirected to `/admin`.
3. Use `/demo` to test chat behavior quickly.
4. In `/admin`, open tickets and settings pages to verify dashboard behavior.
5. Webhooks are handled at `/api/shopify/webhooks` and include:
   - `app/uninstalled`
   - `customers/data_request`
   - `customers/redact`
   - `shop/redact`

## Pricing Note

Before submitting, ensure your listing pricing exactly matches in-app behavior.
If you choose paid plans in listing, implement Shopify Billing API first.
