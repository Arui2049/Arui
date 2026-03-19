function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getAppUrlFromRequest(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return trimTrailingSlash(`${forwardedProto || "https"}://${forwardedHost}`);
  }

  return trimTrailingSlash(new URL(req.url).origin);
}

export function getPublicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  if (typeof window !== "undefined") {
    return trimTrailingSlash(window.location.origin);
  }

  return "";
}
