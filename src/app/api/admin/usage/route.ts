import { NextResponse } from "next/server";
import { getUsageSummary } from "@/lib/billing/usage";
import { getSessionShop } from "@/lib/session";
import { getTickets, getTicketsByDay, getTicketTypeBreakdown, getResolvedRate, getWidgetHeartbeat } from "@/lib/store";

function checkEnvWarnings(): string[] {
  const warnings: string[] = [];
  const llmKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!llmKey || llmKey.includes("replace")) {
    warnings.push("LLM_API_KEY (or OPENAI_API_KEY) is not configured — chat is running in demo mode.");
  }
  if (!process.env.SESSION_SECRET) {
    warnings.push("SESSION_SECRET is not set — sessions are less secure.");
  }
  return warnings;
}

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const usage = getUsageSummary(shop);
  const envWarnings = checkEnvWarnings();
  const apiKeyConfigured = !envWarnings.some((w) => w.includes("LLM_API_KEY"));
  const tickets = getTickets(shop);
  const hasTestTicket = usage.ticketCount > 0 || tickets.length > 0;
  const dailyCounts = getTicketsByDay(shop, 14);
  const typeBreakdown = getTicketTypeBreakdown(shop);
  const resolvedRate = getResolvedRate(shop);
  const lastWidgetPing = getWidgetHeartbeat(shop);
  const widgetInstalled = lastWidgetPing ? (Date.now() - new Date(lastWidgetPing).getTime()) < 86_400_000 : false;
  return NextResponse.json({ ...usage, envWarnings, apiKeyConfigured, hasTestTicket, widgetInstalled, dailyCounts, typeBreakdown, resolvedRate });
}
