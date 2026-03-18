import { NextResponse } from "next/server";
import { getSessionShop } from "@/lib/session";
import { getTickets } from "@/lib/store";
import { getEventsForShop } from "@/lib/events";

function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = Array.from(
    rows.reduce((set, r) => {
      for (const k of Object.keys(r)) set.add(k);
      return set;
    }, new Set<string>()),
  );
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
    const needs = /[",\n]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  const shop = await getSessionShop();
  if (!shop) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = (searchParams.get("kind") || "events").toLowerCase();
  const format = (searchParams.get("format") || "json").toLowerCase();

  if (kind !== "events" && kind !== "tickets") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const data = kind === "tickets"
    ? getTickets(shop, 500, 0)
    : getEventsForShop(shop, 5000);

  if (format === "json") {
    return NextResponse.json({ shop, kind, data });
  }

  const csv = toCsv(data as unknown as Array<Record<string, unknown>>);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="returnbot_${shop}_${kind}.csv"`,
    },
  });
}

