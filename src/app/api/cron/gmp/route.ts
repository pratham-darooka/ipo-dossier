import { NextResponse } from "next/server";
import { dbReady, ensureIpoTable, sql } from "@/lib/db";
import { refreshGmp } from "@/lib/gmp";
import type { IpoSeed } from "@/lib/data";

function authed(req: Request): boolean {
  if (!process.env.CRON_SECRET) return true;
  const { searchParams } = new URL(req.url);
  return (
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` ||
    searchParams.get("secret") === process.env.CRON_SECRET ||
    process.env.NODE_ENV !== "production"
  );
}

// GET /api/cron/gmp — pre-market GMP refresh (03:30 UTC daily).
// Live + upcoming rows only. History capped at 30 points (DB stays small).
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await dbReady())) return NextResponse.json({ ok: false, error: "DATABASE_URL not configured" }, { status: 500 });

  await ensureIpoTable();
  const q = sql()!;
  const rows = (await q`SELECT slug, company, status, data FROM ipo WHERE status IN ('live','upcoming') AND slug != '_pipeline_heartbeat'`) as {
    slug: string; company: string; status: string; data: IpoSeed;
  }[];

  let refreshed = 0;
  let stale = 0;
  for (const r of rows) {
    const d = r.data as IpoSeed;
    const quote = await refreshGmp(d.company, d.symbol, d.priceMax);
    if (quote) {
      const history = [...(d.gmp.history ?? []), { t: quote.at, value: quote.value }].slice(-30);
      d.gmp = { value: quote.value, pct: quote.pct, source: quote.source, at: quote.at, history };
      d.syncedAt = quote.at;
      refreshed++;
    } else {
      stale++;
    }
    await q`UPDATE ipo SET data = ${JSON.stringify(d)}::jsonb, updated_at = NOW() WHERE slug = ${r.slug}`;
  }

  return NextResponse.json({ ok: true, checked: rows.length, refreshed, stale, at: new Date().toISOString() });
}
