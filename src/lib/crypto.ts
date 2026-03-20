import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto";

const SHOP_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export function isValidShopDomain(shop: string): boolean {
  return SHOP_RE.test(shop) && shop.length <= 100;
}

function getSecret(key: "SESSION_SECRET" | "SHOPIFY_API_SECRET"): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not configured`);
  return v;
}

export function hmacSHA256(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

// --- Shopify HMAC verification ---

export function verifyShopifyHmac(query: URLSearchParams): boolean {
  const hmac = query.get("hmac");
  if (!hmac) return false;
  const secret = getSecret("SHOPIFY_API_SECRET");
  const entries = Array.from(query.entries())
    .filter(([k]) => k !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");
  const computed = hmacSHA256(message, secret);
  return timingSafeEqual(computed, hmac);
}

export function verifyShopifyWebhookHmac(body: string, headerHmac: string): boolean {
  const secret = getSecret("SHOPIFY_API_SECRET");
  const computed = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return timingSafeEqual(computed, headerHmac);
}

// --- OAuth state nonce ---

export function generateNonce(): string {
  return randomBytes(24).toString("hex");
}

// --- Session cookie signing ---

export function signSession(shop: string): string {
  const sig = hmacSHA256(shop, getSecret("SESSION_SECRET"));
  return `${shop}:${sig}`;
}

export function verifySession(cookie: string): string | null {
  const idx = cookie.lastIndexOf(":");
  if (idx < 1) return null;
  const shop = cookie.slice(0, idx);
  const sig = cookie.slice(idx + 1);
  const expected = hmacSHA256(shop, getSecret("SESSION_SECRET"));
  if (!timingSafeEqual(expected, sig)) return null;
  if (!isValidShopDomain(shop)) return null;
  return shop;
}

// --- Widget token (daily expiry) ---

const WIDGET_TOKEN_V2_PREFIX = "v2";
const WIDGET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const WIDGET_TOKEN_SKEW_MS = 5 * 60 * 1000; // 5 minutes

function nowMs(): number {
  return Date.now();
}

function generateNonceHex(bytes = 12): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Widget token v2 format:
 *   v2.<issuedAtMs>.<nonceHex>.<hmacHex>
 *
 * - Short-lived (TTL) to reduce risk if it leaks via logs/referer.
 * - Still "public" by nature (must work on storefront), so don't treat as a secret auth mechanism.
 */
export function generateWidgetToken(shop: string): string {
  const secret = getSecret("SESSION_SECRET");
  const ts = String(nowMs());
  const nonce = generateNonceHex();
  const sig = hmacSHA256(`widget:${WIDGET_TOKEN_V2_PREFIX}:${shop}:${ts}:${nonce}`, secret);
  return `${WIDGET_TOKEN_V2_PREFIX}.${ts}.${nonce}.${sig}`;
}

export function verifyWidgetToken(shop: string, token: string): boolean {
  if (!token) return false;
  const secret = getSecret("SESSION_SECRET");

  // v2
  if (token.startsWith(`${WIDGET_TOKEN_V2_PREFIX}.`)) {
    const parts = token.split(".");
    if (parts.length !== 4) return false;
    const [, tsRaw, nonce, sig] = parts;
    const ts = Number(tsRaw);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    if (!nonce || nonce.length > 64) return false;
    if (!sig || sig.length > 128) return false;

    const age = Math.abs(nowMs() - ts);
    if (age > (WIDGET_TOKEN_TTL_MS + WIDGET_TOKEN_SKEW_MS)) return false;

    const expected = hmacSHA256(`widget:${WIDGET_TOKEN_V2_PREFIX}:${shop}:${tsRaw}:${nonce}`, secret);
    return timingSafeEqual(expected, sig);
  }

  // v1 (legacy): daily token with yesterday grace period
  // Keep for backward compatibility with already-embedded scripts.
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);

  const t = hmacSHA256(`widget:${shop}:${today}`, secret);
  if (timingSafeEqual(t, token)) return true;
  const y = hmacSHA256(`widget:${shop}:${yesterday}`, secret);
  return timingSafeEqual(y, token);
}

// --- AES encryption for PII fields and access tokens ---

const AES_ALGO = "aes-256-cbc";

function deriveAESKey(secret: string): Buffer {
  return Buffer.from(hmacSHA256("aes-key-derivation", secret), "hex");
}

export function encryptToken(plaintext: string): string {
  const key = deriveAESKey(getSecret("SESSION_SECRET"));
  const iv = randomBytes(16);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(ciphertext: string): string {
  const key = deriveAESKey(getSecret("SESSION_SECRET"));
  const [ivHex, encHex] = ciphertext.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// --- PII field encryption (customer emails stored at rest) ---

const PII_PREFIX = "pii:";

export function encryptPII(plaintext: string): string {
  if (!plaintext) return plaintext;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return plaintext;
  try {
    const key = deriveAESKey(secret);
    const iv = randomBytes(16);
    const cipher = createCipheriv(AES_ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return `${PII_PREFIX}${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch {
    return plaintext;
  }
}

export function decryptPII(stored: string): string {
  if (!stored || !stored.startsWith(PII_PREFIX)) return stored;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return stored;
  try {
    const payload = stored.slice(PII_PREFIX.length);
    const [ivHex, encHex] = payload.split(":");
    if (!ivHex || !encHex) return stored;
    const key = deriveAESKey(secret);
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const decipher = createDecipheriv(AES_ALGO, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return stored;
  }
}

// --- Timing-safe comparison ---

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
