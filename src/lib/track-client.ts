"use client";

import { pickBestAttribution } from "@/lib/attribution";

const ANON_COOKIE = "rb_anon";
const ANON_STORAGE = "rb_anon_id";

function makeAnonId() {
  // non-crypto id is fine for analytics correlation
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getCookie(name: string): string | null {
  const cookie = typeof document !== "undefined" ? document.cookie : "";
  if (!cookie) return null;
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeS = 60 * 60 * 24 * 365) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeS}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function ensureAnonId(): string {
  if (typeof window === "undefined") return "anon_server";

  const fromCookie = getCookie(ANON_COOKIE);
  if (fromCookie && fromCookie.length <= 120) {
    try { localStorage.setItem(ANON_STORAGE, fromCookie); } catch {}
    return fromCookie;
  }

  try {
    const fromLS = localStorage.getItem(ANON_STORAGE);
    if (fromLS && fromLS.length <= 120) {
      setCookie(ANON_COOKIE, fromLS);
      return fromLS;
    }
  } catch {}

  const id = makeAnonId();
  try { localStorage.setItem(ANON_STORAGE, id); } catch {}
  setCookie(ANON_COOKIE, id);
  return id;
}

export async function track(name: string, props?: Record<string, unknown>) {
  try {
    const anonId = ensureAnonId();
    const attrib = pickBestAttribution();
    const body = {
      name,
      anonId,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      attrib,
      props,
    };
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

