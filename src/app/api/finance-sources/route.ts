import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthed } from "@/lib/auth";
import {
  deleteFinanceSource,
  listFinanceSources,
  upsertFinanceSource,
} from "@/lib/store/sources";
import { invalidateFinanceCache } from "@/lib/finance/aggregator";

export async function GET() {
  const sources = await listFinanceSources();
  return NextResponse.json({ sources });
}

const upsertSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  url: z.string().url(),
});

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные параметры", details: parsed.error.format() }, { status: 400 });
  }
  try {
    const entry = await upsertFinanceSource(parsed.data);
    invalidateFinanceCache();
    return NextResponse.json({ entry });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }
  await deleteFinanceSource(id);
  invalidateFinanceCache();
  return NextResponse.json({ ok: true });
}
