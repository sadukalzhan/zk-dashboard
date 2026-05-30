import { NextResponse } from "next/server";
import { getFinanceData, invalidateFinanceCache } from "@/lib/finance/aggregator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const refresh = url.searchParams.get("refresh") === "1";
  if (!year) return NextResponse.json({ error: "Параметр year обязателен" }, { status: 400 });
  if (refresh) invalidateFinanceCache();
  const data = await getFinanceData(year, { force: refresh });
  return NextResponse.json({ data });
}
