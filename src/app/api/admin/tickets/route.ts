import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { getTickets, getTicketCount } from "@/lib/store";

export async function GET(req: Request) {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const tickets = getTickets(shop, limit, offset);
  const total = getTicketCount(shop);

  return NextResponse.json({ tickets, total, limit, offset });
}
