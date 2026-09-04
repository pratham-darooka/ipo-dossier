import { NextResponse } from "next/server";
import { dbReady, ensureIpoTable, sql } from "@/lib/db";
import { fetchNseLive, fetchNseUpcoming, normName, nseStatusToOurs, slugify, type NseLive } from "@/lib/nse";
import { nseToPartial } from "@/lib/ipos";
import { deepDiveDoc, resolveDocUrl } from "@/lib/docs";
import { resolveListing } from "@/lib/listings";
import { ipoIntel } from "@/lib/tavily";
import { IPOS, type IpoSeed } from "@/lib/data";

export const maxDuration = 60;

function authed(req: Request): boolean {
  if (!process.env.CRON_SECRET) return true;
  const { searchParams } = new URL(req.url);
  return (
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` ||
    searchParams.get("secret") === process.env.CRON_SECRET ||
    process.env.NODE_ENV !== "production"
  );
}

// GET /api/cron/scrape — post-market-open pipeline (04:15 UTC daily).
// Priority: LIVE (subscription + news + docs) -> UPCOMING (docs) -> PAST (listing facts).
// Budgets per run: max 2 doc parses, 5 listing resolutions (serverless time + Tavily budget).
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await dbReady())) return NextResponse.json({ ok: false, error: "DATABASE_URL not configured" }, { status: 500 });

  const [upcoming, live] = await Promise.all([fetchNseUpcoming(), fetchNseLive()]);
  const liveBySymbol = new Map(live.map((l) => [l.symbol, l]));
  const liveByName = new Map(live.map((l) => [normName(l.company), l]));

  await ensureIpoTable();
  const q = sql()!;
  const existing = (await q`SELECT slug, company, status, data FROM ipo`) as { slug: string; company: string; status: string; data: IpoSeed }[];
  const bySlug = new Map(existing.map((r) => [r.slug, r]));
  const seedByName = new Map(IPOS.map((s) => [normName(s.company), s]));

  let updated = 0;
  let inserted = 0;

  // --- 1. NSE calendar + live demand overlay (cheap, all rows) ---
  for (const u of upcoming) {
    const key = normName(u.company);
    const liveHit: NseLive | undefined = liveBySymbol.get(u.symbol) ?? liveByName.get(key);
    const status = nseStatusToOurs(u.status, u.closeDate);
    const seedMatch = seedByName.get(key);
    const resolvedSlug = [...bySlug.values()].find((r) => normName(r.company) === key)?.slug
      ?? seedMatch?.slug
      ?? slugify(`${u.company} ${u.symbol}`);

    const prev = bySlug.get(resolvedSlug);
    const base: IpoSeed = prev
      ? { ...(prev.data as IpoSeed), slug: resolvedSlug }
      : seedMatch
        ? { ...seedMatch }
        : nseToPartial(u, liveHit, status);

    base.company = prev ? ((prev.data as IpoSeed).company || u.company) : (base.company || u.company);
    base.symbol = u.symbol;
    base.status = status === "listed" && base.status === "live" ? "live" : status;
    if (u.openDate) base.openDate = u.openDate;
    if (u.closeDate) base.closeDate = u.closeDate;
    if (u.priceMin) base.priceMin = u.priceMin;
    if (u.priceMax) base.priceMax = u.priceMax;
    if (u.issueSizeShares && !base.issueSizeCr) base.issueSizeCr = Math.round(((u.issueSizeShares * (u.priceMax ?? 0)) / 1e7) * 10) / 10;
    if (liveHit?.totalX != null) {
      base.subscription = { ...base.subscription, total: liveHit.totalX };
      if (base.status === "upcoming") base.status = "live";
    }
    base.partial = (base.financials?.length ?? 0) === 0;
    base.syncedAt = new Date().toISOString();

    const existed = bySlug.has(resolvedSlug);
    await q`
      INSERT INTO ipo (slug, company, status, data)
      VALUES (${resolvedSlug}, ${base.company}, ${base.status}, ${JSON.stringify(base)}::jsonb)
      ON CONFLICT (slug) DO UPDATE SET company = EXCLUDED.company, status = EXCLUDED.status, data = EXCLUDED.data, updated_at = NOW()
    `;
    if (existed) updated++;
    else {
      inserted++;
      bySlug.set(resolvedSlug, { slug: resolvedSlug, company: base.company, status: base.status, data: base });
    }
  }

  // --- 1b. Stale-close transition: rows NSE no longer lists whose window shut -> listed ---
  const feedNames = new Set(upcoming.map((u) => normName(u.company)));
  const today = new Date().toISOString().slice(0, 10);
  let transitioned = 0;
  for (const [slug, r] of bySlug) {
    if (slug === "_pipeline_heartbeat") continue;
    const d = r.data as IpoSeed;
    if (
      (r.status === "live" || r.status === "upcoming") &&
      !feedNames.has(normName(d.company)) &&
      d.closeDate && d.closeDate.slice(0, 10) < today
    ) {
      d.status = "listed";
      d.syncedAt = new Date().toISOString();
      await q`UPDATE ipo SET status = 'listed', data = ${JSON.stringify(d)}::jsonb, updated_at = NOW() WHERE slug = ${slug}`;
      r.status = "listed";
      transitioned++;
    }
  }

  // --- 2. Enrichment, priority-ordered with hard budgets ---
  const all = (await q`SELECT slug, company, status, data FROM ipo WHERE slug != '_pipeline_heartbeat'`) as {
    slug: string; company: string; status: string; data: IpoSeed;
  }[];
  const rank = (s: string) => (s === "live" ? 0 : s === "upcoming" ? 1 : 2);
  all.sort((a, b) => rank(a.status) - rank(b.status));

  // Sync checkpoint first: NSE overlay + transitions are committed even if
  // enrichment later exhausts the function budget.
  const beat = (extra: object) => q`
    INSERT INTO ipo (slug, company, status, data)
    VALUES ('_pipeline_heartbeat', '_pipeline', 'listed', ${JSON.stringify({ at: new Date().toISOString(), nse: upcoming.length, live: live.length, updated, inserted, transitioned, ...extra })}::jsonb)
    ON CONFLICT (slug) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
  await beat({ phase: "sync-done", docsParsed: 0, listingsFixed: 0, newsCached: 0, timedOut: false });

  let docsParsed = 0;
  let listingsFixed = 0;
  let newsCached = 0;
  const DOC_BUDGET = 1; // one deep-dive per run: RHP downloads alone can eat 30s+
  const LISTING_BUDGET = 5;
  const DEADLINE = Date.now() + 40000; // leave headroom inside the 60s function limit
  let timedOut = false;

  for (const r of all) {
    if (Date.now() > DEADLINE) {
      timedOut = true;
      break;
    }
    const d = r.data as IpoSeed & { docUrl?: string };
    let dirty = false;

    // News intel for live rows (Tavily, cached on row)
    if (r.status === "live" && (!d.news?.length || (d.syncedAt && Date.now() - new Date(d.syncedAt).getTime() > 20 * 3600000))) {
      const intel = await ipoIntel(d.company);
      if (intel.news.length) {
        d.news = intel.news.slice(0, 5).map((n) => ({ title: n.title, url: n.url, publishedDate: n.publishedDate }));
        newsCached++;
        dirty = true;
      }
    }

    // Doc deep-dive for partial live/upcoming rows
    if (docsParsed < DOC_BUDGET && (r.status === "live" || r.status === "upcoming") && (d.financials?.length ?? 0) === 0) {
      const url = d.docUrl ?? (await resolveDocUrl(d.company));
      if (url) {
        if (!d.docUrl) {
          (d as Record<string, unknown>).docUrl = url;
          dirty = true;
        }
        const patch = await deepDiveDoc(d.company, url);
        if (patch && Object.keys(patch).length) {
          Object.assign(d, patch);
          d.partial = (d.financials?.length ?? 0) === 0;
          docsParsed++;
          dirty = true;
        }
      }
    }

    // Listing facts for past IPOs (Aug 2026+, facts-only per scope)
    if (
      listingsFixed < LISTING_BUDGET && r.status === "listed" && !d.listingPrice &&
      (!d.closeDate || d.closeDate >= "2026-08-01")
    ) {
      const facts = await resolveListing(d.company, d.priceMax);
      if (facts.price) {
        d.listingPrice = facts.price;
        if (facts.gainPct != null) d.listingGainPct = facts.gainPct;
        if (facts.date && !d.listingDate) d.listingDate = facts.date;
        listingsFixed++;
        dirty = true;
      }
    }

    if (dirty) {
      d.syncedAt = new Date().toISOString();
      await q`UPDATE ipo SET data = ${JSON.stringify(d)}::jsonb, updated_at = NOW() WHERE slug = ${r.slug}`;
    }
  }

  await beat({ phase: "done", docsParsed, listingsFixed, newsCached, timedOut });

  return NextResponse.json({ ok: true, db: "neon", nse: upcoming.length, live: live.length, updated, inserted, transitioned, docsParsed, listingsFixed, newsCached, timedOut });
}
