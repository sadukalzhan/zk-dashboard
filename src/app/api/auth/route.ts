import { NextResponse } from "next/server";
import { clearAuthCookie, isAuthed, setAuthCookie, verifyPassword } from "@/lib/auth";

export async function GET() {
  const ok = await isAuthed();
  return NextResponse.json({ authenticated: ok });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "Введите пароль" }, { status: 400 });
  }
  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }
  await setAuthCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
