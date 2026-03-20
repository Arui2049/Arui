import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { getGdprRequests } from "@/lib/store";

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requests = getGdprRequests(shop);
  return NextResponse.json({ requests });
}
