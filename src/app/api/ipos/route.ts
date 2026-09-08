import { NextResponse } from "next/server";
import { getAllIpos } from "@/lib/ipos";
import { dbReady, sql } from "@/lib/db";

export const revalidate = 300; // live-ish list, still edge-cached

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // Neon-first (live NSE pipeline), seed fallback. Never 500s on DB trouble.
  const all = await getAllIpos();
  const data = status ? all.filter((i) => i.status === status) : all;
  const live = all.some((i) => i.syncedAt);
  let dbRows: number | null = null;
  try {
    if (await dbReady()) {
      const rows = (await sql()!`SELECT count(*)::int AS n FROM ipo WHERE slug NOT LIKE '_pipeline%'`) as { n: number }[];
      dbRows = rows[0]?.n ?? null;
    }
  } catch { /* observability is best-effort */ }
  return NextResponse.json({
    ok: true,
    source: live ? "neon" : "seed",
    count: data.length,
    dbRows,
    servedAt: new Date().toISOString(),
    data,
  });
}
