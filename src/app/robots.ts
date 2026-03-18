import type { MetadataRoute } from "next";

function baseUrl() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export default function robots(): MetadataRoute.Robots {
  const origin = baseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/widget"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

