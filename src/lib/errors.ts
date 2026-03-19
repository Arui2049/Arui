const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

interface ErrorContext {
  shop?: string;
  route?: string;
  customerEmail?: string;
  [key: string]: unknown;
}

export function captureException(error: unknown, context?: ErrorContext) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[Auri Error]", message, context || "");
  if (stack) console.error(stack);

  if (SENTRY_DSN) {
    try {
      const req = (0, eval)("require") as (id: string) => unknown;
      const Sentry = req("@sentry/nextjs") as { setContext?: (name: string, ctx: unknown) => void; captureException?: (e: unknown) => void };
      if (context && typeof Sentry?.setContext === "function") Sentry.setContext("returnbot", context);
      if (typeof Sentry?.captureException === "function") Sentry.captureException(error);
    } catch {
      // Sentry not installed yet — that's fine
    }
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext) {
  const prefix = level === "error" ? "[Auri Error]" : level === "warning" ? "[Auri Warning]" : "[Auri]";
  console.log(prefix, message, context || "");

  if (SENTRY_DSN) {
    try {
      const req = (0, eval)("require") as (id: string) => unknown;
      const Sentry = req("@sentry/nextjs") as { setContext?: (name: string, ctx: unknown) => void; captureMessage?: (m: string, lvl: string) => void };
      if (context && typeof Sentry?.setContext === "function") Sentry.setContext("returnbot", context);
      if (typeof Sentry?.captureMessage === "function") Sentry.captureMessage(message, level);
    } catch {
      // Sentry not installed yet
    }
  }
}
