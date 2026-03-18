export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  ref?: string;
  landing_path?: string;
  referer?: string;
  ts?: string;
};

const FT_COOKIE = "rb_attrib_ft";
const LT_COOKIE = "rb_attrib_lt";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readAttributionFromCookies(): { firstTouch?: Attribution; lastTouch?: Attribution } {
  if (typeof document === "undefined") return {};
  const cookie = document.cookie || "";
  const map: Record<string, string> = {};
  for (const part of cookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    map[k] = decodeURIComponent(v);
  }
  return {
    firstTouch: safeJsonParse<Attribution>(map[FT_COOKIE] || null) || undefined,
    lastTouch: safeJsonParse<Attribution>(map[LT_COOKIE] || null) || undefined,
  };
}

export function pickBestAttribution(): Attribution | undefined {
  const { firstTouch, lastTouch } = readAttributionFromCookies();
  return firstTouch || lastTouch || undefined;
}

