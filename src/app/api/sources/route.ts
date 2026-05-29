import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthed } from "@/lib/auth";
import { deleteSource, listSources, upsertSource, availableMonths } from "@/lib/store/sources";
import { invalidateCache } from "@/lib/sheets/aggregator";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("months") === "1") {
    const months = await availableMonths();
    return NextResponse.json({ months });
  }
  const sources = await listSources();
  return NextResponse.json({ sources });
}

const upsertSchema = z.object({
  line: z.union([z.literal(1), z.literal(2)]),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
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
    const entry = await upsertSource(parsed.data);
    invalidateCache();
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
  await deleteSource(id);
  invalidateCache();
  return NextResponse.json({ ok: true });
}
