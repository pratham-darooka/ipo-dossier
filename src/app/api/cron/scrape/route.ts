import { NextResponse } from "next/server";
import { scrapeAll } from "@/lib/scrapers";
import { dbReady, ensureIpoTable, sql } from "@/lib/db";

// GET /api/cron/scrape?source=all|full — protected by CRON_SECRET in prod
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    const q = searchParams.get("secret");
    if (auth !== `Bearer ${process.env.CRON_SECRET}` && q !== process.env.CRON_SECRET) {
      // Allow unauthenticated in dev for easy testing
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    }
  }

  const result = await scrapeAll();
  let persisted = 0;

  if (await dbReady()) {
    try {
      // Persist a heartbeat row so Neon connection is proven; per-IPO upserts land here next.
      await ensureIpoTable();
      const q = sql()!;
      await q`
        INSERT INTO ipo (slug, company, status, data)
        VALUES ('_pipeline_heartbeat', '_pipeline', 'listed', ${JSON.stringify(result)}::jsonb)
        ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      persisted = 1;
    } catch (e) {
      return NextResponse.json({ ok: true, persisted: 0, dbError: String(e).slice(0, 300), scraped: result });
    }
  }

  return NextResponse.json({ ok: true, persisted, db: persisted ? "neon" : "seed-only (set DATABASE_URL)", scraped: result });
}
