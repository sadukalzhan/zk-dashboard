import { NextResponse } from "next/server";
import { getFinishedProductsData, invalidateFinishedProductsCache } from "@/lib/finished-products/aggregator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  if (refresh) invalidateFinishedProductsCache();
  const data = await getFinishedProductsData({ force: refresh });
  return NextResponse.json({ data });
}
