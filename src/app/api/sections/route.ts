import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthed } from "@/lib/auth";
import { getSections, saveSections } from "@/lib/store/sections";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sections: await getSections() });
}

const sectionsSchema = z.object({
  finance: z.boolean(),
  finishedProducts: z.boolean(),
});

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = sectionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные параметры" }, { status: 400 });
  }
  try {
    await saveSections(parsed.data);
    return NextResponse.json({ sections: parsed.data });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
