import type { MetadataRoute } from "next";
import { COMPETITORS, RETURN_POLICY_TEMPLATES, USE_CASES } from "@/lib/seo/data";

function baseUrl() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = baseUrl();
  const now = new Date();

  const staticPaths = [
    "/",
    "/demo",
    "/connect",
    "/privacy",
    "/terms",
  ];

  const dynamicPaths = [
    ...USE_CASES.map((p) => `/use-cases/${p.slug}`),
    ...RETURN_POLICY_TEMPLATES.map((p) => `/returns-policy/${p.slug}`),
    ...COMPETITORS.map((p) => `/compare/${p.slug}`),
  ];

  return [...staticPaths, ...dynamicPaths].map((path) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}

