import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { getCountsByDay, getTopSources } from "@/lib/events";

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pageViews14d = getCountsByDay(shop, 14, "page_view");
  const connectStarts14d = getCountsByDay(shop, 14, "connect_start");
  const connectSuccess14d = getCountsByDay(shop, 14, "connect_success");
  const topSources30d = getTopSources(shop, 30, 6);
  return NextResponse.json({
    shop,
    pageViews14d,
    connectStarts14d,
    connectSuccess14d,
    topSources30d,
  });
}

