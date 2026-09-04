import { IPOS, type IpoSeed } from "./data";
import { dbReady, listIpos } from "./db";
import { normName, type NseLive, type NseUpcoming } from "./nse";

/** Build a partial dossier row from NSE feeds (no filing data yet — enriched later). */
export function nseToPartial(u: NseUpcoming, live?: NseLive, status?: IpoSeed["status"]): IpoSeed {
  const band = u.priceMax ?? u.priceMin ?? 0;
  return {
    slug: "",
    company: u.company,
    symbol: u.symbol,
    sector: "Mainboard · NSE",
    status: status ?? "upcoming",
    openDate: u.openDate ?? "",
    closeDate: u.closeDate ?? "",
    priceMin: u.priceMin ?? band,
    priceMax: u.priceMax ?? band,
    lotSize: 0,
    issueSizeCr: 0,
    freshIssuePct: 0,
    promoterPre: 0,
    promoterPost: 0,
    registrar: "",
    leadManagers: [],
    objectsOfIssue: [],
    financials: [],
    peers: [],
    subscription: {
      qib: 0,
      nii: 0,
      retail: 0,
      employee: 0,
      total: live?.totalX ?? 0,
    },
    gmp: { value: 0, pct: 0 },
    anchorPct: 0,
    risks: [],
    about: "",
    partial: true,
    syncedAt: new Date().toISOString(),
  };
}

function asSeed(row: Record<string, unknown>): IpoSeed | null {
  const d = row.data as Partial<IpoSeed> | null;
  if (!d || typeof d !== "object") return null;
  if (!d.slug || !d.company) return null;
  return {
    ...(d as IpoSeed),
    status: (row.status as IpoSeed["status"]) ?? (d as IpoSeed).status,
    syncedAt: typeof row.updated_at === "string" ? row.updated_at : (d as IpoSeed).syncedAt,
  };
}

/**
 * Neon-first IPO list. DB rows win on slug/name overlap; seed fills the rest
 * (offline dev, or rows the scraper hasn't seen yet). Never throws — falls back to seed.
 */
export async function getAllIpos(): Promise<IpoSeed[]> {
  try {
    if (await dbReady()) {
      const rows = await listIpos(null);
      if (rows && rows.length) {
        const dbSeeds = rows.map(asSeed).filter((s): s is IpoSeed => s !== null && s.slug !== "_pipeline_heartbeat");
        if (dbSeeds.length) {
          const seen = new Set<string>();
          const merged: IpoSeed[] = [];
          for (const s of dbSeeds) {
            seen.add(s.slug);
            seen.add(normName(s.company));
            merged.push(s);
          }
          for (const s of IPOS) {
            if (!seen.has(s.slug) && !seen.has(normName(s.company))) merged.push(s);
          }
          return merged;
        }
      }
    }
  } catch { /* seed fallback */ }
  return IPOS;
}

export async function findIpo(slug: string): Promise<IpoSeed | undefined> {
  const all = await getAllIpos();
  return all.find((i) => i.slug === slug);
}
