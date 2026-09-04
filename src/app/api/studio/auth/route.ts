import { NextResponse } from "next/server";

const COOKIE = "dossier-studio";

function signed(value: string, secret: string): string {
  let h = 0;
  const s = `${value}.${secret}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return `${value}.${(h >>> 0).toString(36)}`;
}

// POST /api/studio/auth { password, next } — public (this IS the login).
export async function POST(req: Request) {
  const secret = process.env.STUDIO_PASSWORD;
  if (!secret) return NextResponse.json({ ok: false, error: "STUDIO_PASSWORD not set" }, { status: 500 });
  const { password, next } = (await req.json().catch(() => ({}))) as { password?: string; next?: string };
  if (!password || password !== secret) {
    return NextResponse.json({ ok: false, error: "wrong password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, next: next && next.startsWith("/") ? next : "/studio" });
  res.cookies.set(COOKIE, signed("ok", secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

// DELETE /api/studio/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
