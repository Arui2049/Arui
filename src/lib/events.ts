import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import lockfile from "proper-lockfile";

const DATA_DIR = join(process.cwd(), ".data");
const EVENTS = () => join(DATA_DIR, "events.json");

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function ensureFile(file: string) {
  ensure();
  if (!existsSync(file)) writeFileSync(file, "[]");
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

export type EventName =
  | "page_view"
  | "cta_click"
  | "connect_start"
  | "connect_success"
  | "demo_start_live"
  | "widget_loaded"
  | "widget_open"
  | "chat_message_sent"
  | "ticket_created"
  | "review_prompt_shown"
  | "review_prompt_clicked"
  | "review_prompt_dismissed";

export type Attribution = Record<string, unknown>;

export interface EventRecord {
  id: string;
  ts: string;
  name: EventName | string;
  shop?: string;
  anonId?: string;
  path?: string;
  attrib?: Attribution;
  props?: Record<string, unknown>;
}

function makeId() {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function logEvent(input: Omit<EventRecord, "id" | "ts"> & { ts?: string; id?: string }): EventRecord {
  const record: EventRecord = {
    id: input.id || makeId(),
    ts: input.ts || new Date().toISOString(),
    name: input.name,
    ...(input.shop ? { shop: input.shop } : {}),
    ...(input.anonId ? { anonId: input.anonId } : {}),
    ...(input.path ? { path: input.path } : {}),
    ...(input.attrib ? { attrib: input.attrib } : {}),
    ...(input.props ? { props: input.props } : {}),
  };

  withLock(EVENTS(), () => {
    const list = readJSON<EventRecord[]>(EVENTS(), []);
    list.unshift(record);
    if (list.length > 20_000) list.length = 20_000;
    writeJSON(EVENTS(), list);
  });

  return record;
}

export function getEventsForShop(shop: string, limit = 5000): EventRecord[] {
  const list = readJSON<EventRecord[]>(EVENTS(), []);
  return list.filter((e) => e.shop === shop).slice(0, limit);
}

export function getCountsByDay(shop: string, days = 14, nameFilter?: string): Array<{ date: string; count: number }> {
  const events = getEventsForShop(shop, 20_000);
  const now = new Date();
  const result: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = events.filter((e) => e.ts.slice(0, 10) === dateStr && (!nameFilter || e.name === nameFilter)).length;
    result.push({ date: dateStr, count });
  }
  return result;
}

export function getTopSources(shop: string, days = 30, topN = 5): Array<{ source: string; count: number }> {
  const events = getEventsForShop(shop, 20_000);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const counts: Record<string, number> = {};
  for (const e of events) {
    const t = Date.parse(e.ts);
    if (!Number.isFinite(t) || t < cutoff) continue;
    const a = e.attrib || {};
    const src = String((a.utm_source as string | undefined) || (a.ref as string | undefined) || (a.referer as string | undefined) || "unknown");
    const key = src.length > 120 ? src.slice(0, 120) : src;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

