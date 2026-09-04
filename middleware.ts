import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "dossier-studio";
const GATE = ["/studio", "/api/social/log", "/api/social/generate"];
// NOTE: carousel PNG endpoints stay PUBLIC-but-unlisted (noindex, no links):
// Meta's API must fetch image URLs directly for phase-2 auto-posting.

function signed(value: string, secret: string): string {
  let h = 0;
  const s = `${value}.${secret}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return `${value}.${(h >>> 0).toString(36)}`;
}

export function studioCookieValue(secret: string): string {
  return signed("ok", secret);
}

export function studioAuthed(req: NextRequest): boolean {
  const secret = process.env.STUDIO_PASSWORD;
  if (!secret) return true; // gate disabled until a password is set
  return req.cookies.get(COOKIE)?.value === signed("ok", secret);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/studio/login") return NextResponse.next();
  if (GATE.some((g) => pathname === g || pathname.startsWith(`${g}/`))) {
    if (!studioAuthed(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/studio/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/api/social/log/:path*", "/api/social/log", "/api/social/generate/:path*", "/api/social/generate"],
};
