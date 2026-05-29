import { NextResponse } from "next/server";
import { invalidateCache } from "@/lib/sheets/aggregator";

export async function POST() {
  invalidateCache();
  return NextResponse.json({ ok: true });
}
