// Simple password-based auth for settings panel.
// Sets a signed cookie on successful login. No user accounts.

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "zk_admin";
const COOKIE_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin";
  if (input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function isAuthed(): Promise<boolean> {
  const c = await cookies();
  const cookie = c.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const [val, sig] = cookie.split(".");
  if (!val || !sig) return false;
  try {
    const expected = sign(val);
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function setAuthCookie(): Promise<void> {
  const c = await cookies();
  const value = `ok-${Date.now()}`;
  const signed = `${value}.${sign(value)}`;
  c.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_TTL_SEC,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
