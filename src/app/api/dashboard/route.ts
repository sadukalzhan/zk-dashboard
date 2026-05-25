import { NextResponse } from "next/server";
import { getLineMonthData, invalidateCache } from "@/lib/sheets/aggregator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const line = Number(url.searchParams.get("line"));
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  const refresh = url.searchParams.get("refresh") === "1";

  if (![1, 2].includes(line) || !year || !month) {
    return NextResponse.json({ error: "Параметры line/year/month обязательны" }, { status: 400 });
  }

  if (refresh) invalidateCache();

  const data = await getLineMonthData(line as 1 | 2, year, month, { force: refresh });
  return NextResponse.json({ data });
}
