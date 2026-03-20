import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import lockfile from "proper-lockfile";
import { encryptToken, decryptToken, encryptPII, decryptPII } from "./crypto";

const DATA_DIR = join(process.cwd(), ".data");

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file: string, data: unknown) {
  ensure();
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureFile(file: string) {
  ensure();
  if (!existsSync(file)) writeFileSync(file, "[]");
}

function withLock<T>(file: string, fn: () => T): T {
  ensureFile(file);
  let release: (() => void) | undefined;
  try {
    release = lockfile.lockSync(file);
    return fn();
  } finally {
    if (release) release();
  }
}

interface ShopRecord { shop: string; accessToken: string; installedAt: string }
interface StoredShopRecord { shop: string; accessTokenEncrypted: string; installedAt: string }
interface UsageRecord { shop: string; month: string; ticketCount: number }
export interface GdprRequestRecord {
  id: string;
  topic: string;
  shop: string;
  customerEmail?: string;
  status: "processed" | "needs_manual_review";
  details: string;
  exportedData?: unknown;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  shop: string;
  customerEmail: string;
  orderName: string;
  type: "return" | "exchange" | "tracking" | "inquiry";
  status: "resolved" | "pending";
  summary: string;
  createdAt: string;
}

export interface ShopSettings {
  shop: string;
  returnWindowDays: number;
  returnConditions: string[];
  welcomeMessage: string;
  language: string;
  tone: "friendly" | "professional" | "casual";
  notifyOnReturn: boolean;
  notifyEmail: string;
}

export interface BillingState {
  shop: string;
  status: "none" | "active" | "trialing" | "past_due" | "canceled" | "expired" | "frozen" | "unknown";
  subscriptionId?: string;
  planKey?: string;
  planName?: string;
  currentPeriodEnd?: string;
  trialDays?: number;
  usageLineItemId?: string;
  cappedAmountUsd?: number;
  checkedAt: string;
  raw?: unknown;
}

const SHOPS = () => join(DATA_DIR, "shops.json");
const USAGE = () => join(DATA_DIR, "usage.json");
const TICKETS = () => join(DATA_DIR, "tickets.json");
const SETTINGS = () => join(DATA_DIR, "settings.json");
const GDPR_REQUESTS = () => join(DATA_DIR, "gdpr-requests.json");
const ACCESS_LOG = () => join(DATA_DIR, "access.log");
const BILLING = () => join(DATA_DIR, "billing.json");

function logDataAccess(action: string, shop: string, detail?: string) {
  try {
    ensure();
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      action,
      shop,
      ...(detail ? { detail } : {}),
    }) + "\n";
    appendFileSync(ACCESS_LOG(), line);
  } catch {
    // Non-fatal: don't let logging break data operations
  }
}

function hasEncryption(): boolean {
  return !!process.env.SESSION_SECRET;
}

function encryptAccessToken(token: string): string {
  if (!hasEncryption()) return token;
  try { return encryptToken(token); } catch { return token; }
}

function decryptAccessToken(stored: string): string {
  if (!hasEncryption()) return stored;
  if (!stored.includes(":")) return stored;
  try { return decryptToken(stored); } catch { return stored; }
}

export function saveShop(r: ShopRecord) {
  withLock(SHOPS(), () => {
    const list = readJSON<StoredShopRecord[]>(SHOPS(), []);
    const encrypted: StoredShopRecord = {
      shop: r.shop,
      accessTokenEncrypted: encryptAccessToken(r.accessToken),
      installedAt: r.installedAt,
    };
    const i = list.findIndex((s) => s.shop === r.shop);
    if (i >= 0) list[i] = encrypted; else list.push(encrypted);
    writeJSON(SHOPS(), list);
  });
}

export function getShop(domain: string): ShopRecord | undefined {
  const list = readJSON<StoredShopRecord[]>(SHOPS(), []);
  const found = list.find((s) => s.shop === domain);
  if (!found) return undefined;
  return {
    shop: found.shop,
    accessToken: decryptAccessToken(found.accessTokenEncrypted),
    installedAt: found.installedAt,
  };
}

export function removeShop(domain: string) {
  withLock(SHOPS(), () => {
    const list = readJSON<StoredShopRecord[]>(SHOPS(), []);
    const filtered = list.filter((s) => s.shop !== domain);
    writeJSON(SHOPS(), filtered);
  });
}

function curMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function incrementUsage(shop: string): UsageRecord {
  return withLock(USAGE(), () => {
    const list = readJSON<UsageRecord[]>(USAGE(), []);
    const month = curMonth();
    let r = list.find((x) => x.shop === shop && x.month === month);
    if (!r) { r = { shop, month, ticketCount: 0 }; list.push(r); }
    r.ticketCount += 1;
    writeJSON(USAGE(), list);
    return r;
  });
}

export function getUsage(shop: string): UsageRecord {
  const month = curMonth();
  return readJSON<UsageRecord[]>(USAGE(), []).find((x) => x.shop === shop && x.month === month)
    || { shop, month, ticketCount: 0 };
}

export function removeUsage(shop: string) {
  withLock(USAGE(), () => {
    const list = readJSON<UsageRecord[]>(USAGE(), []);
    const filtered = list.filter((x) => x.shop !== shop);
    writeJSON(USAGE(), filtered);
  });
}

// --- Ticket records ---

function encryptTicket(ticket: TicketRecord): TicketRecord {
  return { ...ticket, customerEmail: encryptPII(ticket.customerEmail) };
}

function decryptTicket(ticket: TicketRecord): TicketRecord {
  return { ...ticket, customerEmail: decryptPII(ticket.customerEmail) };
}

export function saveTicket(ticket: TicketRecord) {
  withLock(TICKETS(), () => {
    const list = readJSON<TicketRecord[]>(TICKETS(), []);
    list.unshift(encryptTicket(ticket));
    if (list.length > 500) list.length = 500;
    writeJSON(TICKETS(), list);
  });
  logDataAccess("ticket_create", ticket.shop);
}

export function getTickets(shop: string, limit = 50, offset = 0): TicketRecord[] {
  logDataAccess("ticket_list", shop);
  const list = readJSON<TicketRecord[]>(TICKETS(), []);
  return list.filter((t) => t.shop === shop).slice(offset, offset + limit).map(decryptTicket);
}

export function getTicketCount(shop: string): number {
  const list = readJSON<TicketRecord[]>(TICKETS(), []);
  return list.filter((t) => t.shop === shop).length;
}

// --- Shop settings ---

const DEFAULT_SETTINGS: Omit<ShopSettings, "shop"> = {
  returnWindowDays: 30,
  returnConditions: ["unused", "original_packaging", "with_tags"],
  welcomeMessage: "Hi! I’m Auri, your AI support assistant. How can I help you today?",
  language: "en",
  tone: "friendly",
  notifyOnReturn: true,
  notifyEmail: "",
};

export function getSettings(shop: string): ShopSettings {
  const list = readJSON<ShopSettings[]>(SETTINGS(), []);
  const found = list.find((s) => s.shop === shop);
  return found || { shop, ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: ShopSettings) {
  withLock(SETTINGS(), () => {
    const list = readJSON<ShopSettings[]>(SETTINGS(), []);
    const i = list.findIndex((s) => s.shop === settings.shop);
    if (i >= 0) list[i] = settings; else list.push(settings);
    writeJSON(SETTINGS(), list);
  });
}

// --- Analytics helpers ---

export interface DailyCount { date: string; count: number }
export interface TypeBreakdown { type: string; count: number }

export function getTicketsByDay(shop: string, days = 14): DailyCount[] {
  const tickets = readJSON<TicketRecord[]>(TICKETS(), []).filter((t) => t.shop === shop).map(decryptTicket);
  const now = new Date();
  const result: DailyCount[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = tickets.filter((t) => t.createdAt.slice(0, 10) === dateStr).length;
    result.push({ date: dateStr, count });
  }
  return result;
}

export function getTicketTypeBreakdown(shop: string): TypeBreakdown[] {
  const tickets = readJSON<TicketRecord[]>(TICKETS(), []).filter((t) => t.shop === shop).map(decryptTicket);
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    counts[t.type] = (counts[t.type] || 0) + 1;
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

export function getResolvedRate(shop: string): number {
  const tickets = readJSON<TicketRecord[]>(TICKETS(), []).filter((t) => t.shop === shop).map(decryptTicket);
  if (tickets.length === 0) return 100;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  return Math.round((resolved / tickets.length) * 100);
}

// --- GDPR helpers ---

export function getTicketsByCustomerEmail(shop: string, email: string): TicketRecord[] {
  logDataAccess("gdpr_data_export", shop, "customer_email_lookup");
  const list = readJSON<TicketRecord[]>(TICKETS(), []);
  const lower = email.toLowerCase();
  return list
    .map(decryptTicket)
    .filter((t) => t.shop === shop && t.customerEmail.toLowerCase() === lower);
}

export function removeTicketsByCustomerEmail(shop: string, email: string) {
  logDataAccess("gdpr_customer_redact", shop, "customer_email_delete");
  withLock(TICKETS(), () => {
    const list = readJSON<TicketRecord[]>(TICKETS(), []);
    const lower = email.toLowerCase();
    const filtered = list.filter(
      (t) => !(t.shop === shop && decryptPII(t.customerEmail).toLowerCase() === lower),
    );
    writeJSON(TICKETS(), filtered);
  });
}

export function removeAllShopData(shop: string) {
  removeShop(shop);
  removeUsage(shop);

  withLock(TICKETS(), () => {
    const list = readJSON<TicketRecord[]>(TICKETS(), []);
    writeJSON(TICKETS(), list.filter((t) => t.shop !== shop));
  });

  withLock(SETTINGS(), () => {
    const list = readJSON<ShopSettings[]>(SETTINGS(), []);
    writeJSON(SETTINGS(), list.filter((s) => s.shop !== shop));
  });

  withLock(HEARTBEATS(), () => {
    const list = readJSON<HeartbeatRecord[]>(HEARTBEATS(), []);
    writeJSON(HEARTBEATS(), list.filter((h) => h.shop !== shop));
  });

  removeGdprRequestsByShop(shop);
  removeBilling(shop);
}

export function recordGdprRequest(input: {
  topic: string;
  shop: string;
  customerEmail?: string;
  status: "processed" | "needs_manual_review";
  details: string;
  exportedData?: unknown;
}) {
  withLock(GDPR_REQUESTS(), () => {
    const list = readJSON<GdprRequestRecord[]>(GDPR_REQUESTS(), []);
    list.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      topic: input.topic,
      shop: input.shop,
      customerEmail: input.customerEmail,
      status: input.status,
      details: input.details,
      exportedData: input.exportedData,
      createdAt: new Date().toISOString(),
    });
    if (list.length > 1000) list.length = 1000;
    writeJSON(GDPR_REQUESTS(), list);
  });
}

export function getGdprRequests(shop: string): GdprRequestRecord[] {
  return readJSON<GdprRequestRecord[]>(GDPR_REQUESTS(), [])
    .filter((r) => r.shop === shop);
}

export function removeGdprRequestsByShop(shop: string) {
  withLock(GDPR_REQUESTS(), () => {
    const list = readJSON<GdprRequestRecord[]>(GDPR_REQUESTS(), []);
    writeJSON(GDPR_REQUESTS(), list.filter((r) => r.shop !== shop));
  });
}

// --- Widget heartbeat ---

interface HeartbeatRecord { shop: string; lastPing: string }
const HEARTBEATS = () => join(DATA_DIR, "heartbeats.json");

export function recordWidgetHeartbeat(shop: string) {
  withLock(HEARTBEATS(), () => {
    const list = readJSON<HeartbeatRecord[]>(HEARTBEATS(), []);
    const i = list.findIndex((h) => h.shop === shop);
    const record = { shop, lastPing: new Date().toISOString() };
    if (i >= 0) list[i] = record; else list.push(record);
    writeJSON(HEARTBEATS(), list);
  });
}

export function getWidgetHeartbeat(shop: string): string | null {
  const list = readJSON<HeartbeatRecord[]>(HEARTBEATS(), []);
  const found = list.find((h) => h.shop === shop);
  return found?.lastPing || null;
}

// --- Billing state (Shopify Billing API sync cache) ---

export function saveBilling(state: BillingState) {
  withLock(BILLING(), () => {
    const list = readJSON<BillingState[]>(BILLING(), []);
    const i = list.findIndex((x) => x.shop === state.shop);
    if (i >= 0) list[i] = state; else list.push(state);
    writeJSON(BILLING(), list);
  });
}

export function getBilling(shop: string): BillingState | null {
  const list = readJSON<BillingState[]>(BILLING(), []);
  return list.find((x) => x.shop === shop) || null;
}

export function removeBilling(shop: string) {
  withLock(BILLING(), () => {
    const list = readJSON<BillingState[]>(BILLING(), []);
    writeJSON(BILLING(), list.filter((x) => x.shop !== shop));
  });
}
