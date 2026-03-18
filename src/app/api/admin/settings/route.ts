import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { getSettings, saveSettings, type ShopSettings } from "@/lib/store";

export async function GET() {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getSettings(shop));
}

export async function PUT(req: Request) {
  const shop = await getSessionShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const settings: ShopSettings = {
    shop,
    returnWindowDays: Math.max(1, Math.min(365, parseInt(body.returnWindowDays, 10) || 30)),
    returnConditions: Array.isArray(body.returnConditions) ? body.returnConditions : ["unused"],
    welcomeMessage: String(body.welcomeMessage || "").slice(0, 500) || "Hi! I’m Auri. How can I help?",
    language: typeof body.language === "string" && body.language.length <= 5 ? body.language : "en",
    tone: ["friendly", "professional", "casual"].includes(body.tone) ? body.tone : "friendly",
    notifyOnReturn: !!body.notifyOnReturn,
    notifyEmail: String(body.notifyEmail || "").slice(0, 200),
  };

  saveSettings(settings);
  return NextResponse.json({ success: true, settings });
}
