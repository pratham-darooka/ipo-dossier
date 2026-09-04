import { NextResponse } from "next/server";
import { IPOS } from "@/lib/data";
import { dbReady, listIpos } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // Prefer Neon when configured, else seed fallback (offline-friendly)
  if (await dbReady()) {
    try {
      const rows = await listIpos(status);
      if (rows && rows.length) return NextResponse.json({ ok: true, source: "neon", count: rows.length, data: rows });
    } catch { /* fall through to seed */ }
  }

  const data = status ? IPOS.filter((i) => i.status === status) : IPOS;
  return NextResponse.json({ ok: true, source: "seed", count: data.length, data });
}
