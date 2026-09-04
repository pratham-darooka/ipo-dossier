import { dbReady, sql } from "./db";
import type { IpoSeed } from "./data";

export type DossierCheck = { label: string; state: "done" | "pending" | "na"; detail: string };
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
  const listed = d.status === "listed";
  const checks: DossierCheck[] = [
    { label: "Calendar", state: d.openDate ? "done" : "pending", detail: d.openDate ? d.openDate.slice(0, 10) : "awaiting NSE" },
    { label: "Band", state: d.priceMax > 0 ? "done" : "pending", detail: d.priceMax > 0 ? `₹${d.priceMin}–₹${d.priceMax}` : "drops ~a week pre-open" },
    {
      label: "Demand",
      state: d.subscription.total > 0 ? "done" : "pending",
      detail: d.subscription.total > 0 ? `${d.subscription.total}x total` : d.status === "upcoming" ? "opens Day 1" : "resolving final figures",
    },
    {
      label: "Financials",
      state: (d.financials?.length ?? 0) >= 3 ? "done" : "pending",
      detail: d.financials?.length ? `${d.financials.length}/3yr parsed` : "RHP pending",
    },
    // GMP is meaningless post-listing — N/A for listed (the ledger takes over), live check for the rest.
    listed
      ? { label: "GMP", state: "na", detail: "n/a post-listing — see ledger" }
      : { label: "GMP", state: gmpAge < GMP_FRESH_MS ? "done" : "pending", detail: d.gmp.pct > 0 ? `+${d.gmp.pct}%` : "no quote yet" },
  ];
  if (listed) {
    checks.push({
      label: "Listing",
      state: d.listingPrice != null ? "done" : "pending",
      detail: d.listingPrice != null ? `₹${d.listingPrice} (${d.listingGainPct}%)` : "resolving",
    });
  }
  if (d.status === "live") {
    checks.push({ label: "News", state: (d.news?.length ?? 0) > 0 ? "done" : "pending", detail: d.news?.length ? `${d.news.length} stories` : "collecting" });
  }
  const applicable = checks.filter((c) => c.state !== "na");
  const done = applicable.filter((c) => c.state === "done").length;
  const firstOpen = applicable.find((c) => c.state !== "done");
  return { checks, pct: applicable.length ? Math.round((done / applicable.length) * 100) : 100, nextStep: firstOpen ? `${firstOpen.label}: ${firstOpen.detail}` : "Complete ✓" };
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
