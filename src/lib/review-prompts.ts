import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import lockfile from "proper-lockfile";

const DATA_DIR = join(process.cwd(), ".data");
const FILE = () => join(DATA_DIR, "review_prompts.json");

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

export type ReviewAction = "shown" | "clicked" | "dismissed";

export interface ReviewPromptState {
  shop: string;
  lastShownAt?: string;
  lastClickedAt?: string;
  lastDismissedAt?: string;
}

export function getReviewState(shop: string): ReviewPromptState {
  const list = readJSON<ReviewPromptState[]>(FILE(), []);
  return list.find((r) => r.shop === shop) || { shop };
}

export function recordReviewAction(shop: string, action: ReviewAction, ts = new Date().toISOString()): ReviewPromptState {
  return withLock(FILE(), () => {
    const list = readJSON<ReviewPromptState[]>(FILE(), []);
    const i = list.findIndex((r) => r.shop === shop);
    const cur: ReviewPromptState = i >= 0 ? list[i] : { shop };
    if (action === "shown") cur.lastShownAt = ts;
    if (action === "clicked") cur.lastClickedAt = ts;
    if (action === "dismissed") cur.lastDismissedAt = ts;
    if (i >= 0) list[i] = cur; else list.push(cur);
    writeJSON(FILE(), list);
    return cur;
  });
}

export function canPromptReview(state: ReviewPromptState, now = Date.now()) {
  const day = 24 * 60 * 60 * 1000;
  const shown = state.lastShownAt ? Date.parse(state.lastShownAt) : 0;
  const dismissed = state.lastDismissedAt ? Date.parse(state.lastDismissedAt) : 0;
  const clicked = state.lastClickedAt ? Date.parse(state.lastClickedAt) : 0;

  // cooldowns: if dismissed recently, back off longer; if clicked, stop prompting for a long time
  if (clicked && now - clicked < 180 * day) return false;      // 180d
  if (dismissed && now - dismissed < 30 * day) return false;   // 30d
  if (shown && now - shown < 14 * day) return false;           // 14d
  return true;
}

