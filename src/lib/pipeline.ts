import { dbReady, sql } from "./db";
import type { IpoSeed } from "./data";

export type DossierCheck = { label: string; done: boolean; detail: string };
export type DossierRow = {
  slug: string;
  company: string;
  status: string;
  pct: number;
  checks: DossierCheck[];
  nextStep: string;
  syncedAt: string | null;
};

const GMP_FRESH_MS = 48 * 3600000;

export function dossierChecks(d: IpoSeed): { checks: DossierCheck[]; pct: number; nextStep: string } {
  const gmpAge = d.gmp.at ? Date.now() - new Date(d.gmp.at).getTime() : Infinity;
  const checks: DossierCheck[] = [
    { label: "Calendar", done: Boolean(d.openDate), detail: d.openDate ? d.openDate.slice(0, 10) : "awaiting NSE" },
    { label: "Band", done: d.priceMax > 0, detail: d.priceMax > 0 ? `₹${d.priceMin}–₹${d.priceMax}` : "drops ~a week pre-open" },
    {
      label: "Demand",
      done: d.subscription.total > 0,
      detail: d.subscription.total > 0 ? `${d.subscription.total}x total` : d.status === "listed" ? "window shut" : "opens Day 1",
    },
    {
      label: "Financials",
      done: (d.financials?.length ?? 0) > 0,
      detail: d.financials?.length ? `${d.financials.length}yr parsed` : "RHP pending",
    },
    {
      label: "GMP",
      done: gmpAge < GMP_FRESH_MS,
      detail: d.gmp.pct > 0 ? (gmpAge < GMP_FRESH_MS ? `+${d.gmp.pct}% fresh` : `+${d.gmp.pct}% stale`) : "no quote yet",
    },
  ];
  if (d.status === "listed") {
    checks.push({
      label: "Listing",
      done: d.listingPrice != null,
      detail: d.listingPrice != null ? `₹${d.listingPrice} (${d.listingGainPct}%)` : "resolving",
    });
  }
  if (d.status === "live") {
    checks.push({ label: "News", done: (d.news?.length ?? 0) > 0, detail: d.news?.length ? `${d.news.length} stories` : "collecting" });
  }
  const done = checks.filter((c) => c.done).length;
  const firstOpen = checks.find((c) => !c.done);
  return { checks, pct: Math.round((done / checks.length) * 100), nextStep: firstOpen ? `${firstOpen.label}: ${firstOpen.detail}` : "Complete ✓" };
}

export type PipelineStatus = {
  sync: Record<string, unknown> | null;
  syncAt: string | null;
  gmp: Record<string, unknown> | null;
  gmpAt: string | null;
  rows: DossierRow[];
  counts: { complete: number; building: number; total: number };
};

/** Live pipeline visibility: heartbeat rows + per-IPO dossier completeness. Never throws. */
export async function getPipelineStatus(): Promise<PipelineStatus> {
  const empty: PipelineStatus = { sync: null, syncAt: null, gmp: null, gmpAt: null, rows: [], counts: { complete: 0, building: 0, total: 0 } };
  try {
    if (!(await dbReady())) return empty;
    const q = sql()!;
    const beats = (await q`SELECT slug, data, updated_at FROM ipo WHERE slug IN ('_pipeline_heartbeat','_pipeline_gmp')`) as {
      slug: string; data: Record<string, unknown>; updated_at: string;
    }[];
    const rows = (await q`SELECT slug, company, status, data, updated_at FROM ipo WHERE slug NOT IN ('_pipeline_heartbeat','_pipeline_gmp') ORDER BY status, company`) as {
      slug: string; company: string; status: string; data: IpoSeed; updated_at: string;
    }[];
    const sync = beats.find((b) => b.slug === "_pipeline_heartbeat");
    const gmp = beats.find((b) => b.slug === "_pipeline_gmp");
    const out: DossierRow[] = rows.map((r) => {
      const { checks, pct, nextStep } = dossierChecks(r.data as IpoSeed);
      return { slug: r.slug, company: (r.data as IpoSeed).company || r.company, status: r.status, pct, checks, nextStep, syncedAt: (r.data as IpoSeed).syncedAt ?? null };
    });
    const complete = out.filter((r) => r.pct === 100).length;
    return {
      sync: (sync?.data as Record<string, unknown>) ?? null,
      syncAt: sync ? String(sync.updated_at) : null,
      gmp: (gmp?.data as Record<string, unknown>) ?? null,
      gmpAt: gmp ? String(gmp.updated_at) : null,
      rows: out,
      counts: { complete, building: out.length - complete, total: out.length },
    };
  } catch {
    return empty;
  }
}
