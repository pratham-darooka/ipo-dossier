import { groqExtractFiling } from "./ai/groq";
import type { IpoSeed } from "./data";

/**
 * Press-enrichment layer: the holy-bible rule — show the best information available
 * ONLINE today, upgrade to filing-grade when an RHP parse succeeds. Never leave a
 * dossier building while the internet already knows the answers.
 *
 * Merge-only-empty: never overwrites filing-grade (finSource rhp) or verified values.
 * One Tavily search per call. Returns a patch + whether a search was spent.
 */

type PressJson = {
  financials?: { fy?: string; revenueCr?: number; patCr?: number; roe?: number; roce?: number; de?: number; cfoCr?: number }[];
  peers?: { name?: string; pe?: number; pb?: number; roe?: number }[];
  risks?: string[];
  objectsOfIssue?: string[];
  promoterPre?: number;
  promoterPost?: number;
  freshIssuePct?: number;
  registrar?: string;
  leadManagers?: string[];
  about?: string;
  lotSize?: number;
  issueSizeCr?: number;
  subscriptionTotal?: number;
  qib?: number;
  nii?: number;
  retail?: number;
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown, n = 0): string => (typeof v === "string" && v.trim().length > 5 ? v.trim().slice(0, n || v.trim().length) : "");

async function pressSearch(company: string): Promise<{ text: string; urls: string[] }> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { text: "", urls: [] };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: `${company} IPO financials revenue PAT lot size objects of issue lead manager registrar risks subscription`,
        search_depth: "advanced",
        max_results: 8,
        include_answer: true,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return { text: "", urls: [] };
    const j = (await r.json()) as { results?: { title?: string; url?: string; content?: string }[]; answer?: string };
    const parts: string[] = [];
    if (j.answer) parts.push(`SUMMARY: ${j.answer}`);
    for (const h of j.results ?? []) {
      parts.push(`--- ${h.title ?? ""} (${h.url ?? ""})\n${(h.content ?? "").slice(0, 1500)}`);
    }
    return { text: parts.join("\n").slice(0, 12000), urls: (j.results ?? []).map((h) => h.url ?? "").filter(Boolean) };
  } catch {
    return { text: "", urls: [] };
  }
}

function mergeFin(base: IpoSeed["financials"], add: PressJson["financials"]): IpoSeed["financials"] {
  if (!Array.isArray(add)) return base;
  const byFy = new Map(base.map((r) => [r.fy, r]));
  for (const r of add) {
    if (typeof r?.fy !== "string") continue;
    const prev = byFy.get(r.fy) ?? { fy: r.fy, revenueCr: 0, patCr: 0, roe: 0, roce: 0, de: 0, cfoCr: 0 };
    byFy.set(r.fy, {
      fy: r.fy,
      revenueCr: num(r.revenueCr) || prev.revenueCr,
      patCr: num(r.patCr) || prev.patCr,
      roe: num(r.roe) || prev.roe,
      roce: num(r.roce) || prev.roce,
      de: num(r.de) || prev.de,
      cfoCr: num(r.cfoCr) || prev.cfoCr,
    });
  }
  return [...byFy.values()].slice(-3);
}

/**
 * Fill every EMPTY dossier field from press coverage. Skips rows already complete.
 * Returns { patch, searches } — patch is {} when nothing new found.
 */
export async function pressEnrich(d: IpoSeed): Promise<{ patch: Partial<IpoSeed>; searches: number }> {
  const filingGrade = d.finSource === "rhp";
  const needs =
    (!filingGrade && (d.financials?.length ?? 0) < 3) ||
    !d.about || !d.registrar || !d.leadManagers?.length || !d.objectsOfIssue?.length ||
    !d.lotSize || !d.risks?.length || !d.peers?.length ||
    (d.subscription.total === 0 && d.status !== "upcoming");
  if (!needs) return { patch: {}, searches: 0 };

  const { text } = await pressSearch(d.company);
  if (text.trim().length < 500) return { patch: {}, searches: 1 };

  const ex = (await groqExtractFiling(
    `Extract every IPO fact below into the JSON schema. Company: ${d.company}.\n\n${text}`
  )) as (PressJson & { subscriptionTotal?: number; qib?: number; nii?: number; retail?: number; lotSize?: number; issueSizeCr?: number }) | null;
  if (!ex) return { patch: {}, searches: 1 };

  const patch: Partial<IpoSeed> = {};
  if (!filingGrade && Array.isArray(ex.financials) && ex.financials.length) {
    const merged = mergeFin(d.financials, ex.financials);
    if (merged.length > d.financials.length || JSON.stringify(merged) !== JSON.stringify(d.financials)) {
      patch.financials = merged;
      if (!d.finSource) (patch as Record<string, unknown>).finSource = "press";
    }
  }
  if (!d.about && str(ex.about, 500)) patch.about = str(ex.about, 500);
  if (!d.registrar && str(ex.registrar, 60)) patch.registrar = str(ex.registrar, 60);
  if (!d.leadManagers?.length && Array.isArray(ex.leadManagers)) {
    const leads = ex.leadManagers.filter((x) => typeof x === "string").slice(0, 4) as string[];
    if (leads.length) patch.leadManagers = leads;
  }
  if (!d.objectsOfIssue?.length && Array.isArray(ex.objectsOfIssue)) {
    const objs = ex.objectsOfIssue.filter((x) => typeof x === "string" && x.length > 5).slice(0, 6) as string[];
    if (objs.length) patch.objectsOfIssue = objs;
  }
  if (!d.risks?.length && Array.isArray(ex.risks)) {
    const risks = ex.risks.filter((x) => typeof x === "string" && x.length > 10).slice(0, 8) as string[];
    if (risks.length) patch.risks = risks;
  }
  if (!d.peers?.length && Array.isArray(ex.peers)) {
    const peers = ex.peers.filter((p) => typeof p?.name === "string").slice(0, 4) as IpoSeed["peers"];
    if (peers.length) patch.peers = peers;
  }
  if (!d.lotSize && num(ex.lotSize)) patch.lotSize = num(ex.lotSize);
  if (!d.issueSizeCr && num(ex.issueSizeCr)) patch.issueSizeCr = num(ex.issueSizeCr);
  if (d.subscription.total === 0 && d.status !== "upcoming") {
    const sub = { ...d.subscription };
    if (num(ex.subscriptionTotal)) sub.total = num(ex.subscriptionTotal);
    if (num(ex.qib)) sub.qib = num(ex.qib);
    if (num(ex.nii)) sub.nii = num(ex.nii);
    if (num(ex.retail)) sub.retail = num(ex.retail);
    if (sub.total > 0) patch.subscription = sub;
  }
  if (typeof ex.promoterPre === "number" && !d.promoterPre) patch.promoterPre = ex.promoterPre;
  if (typeof ex.promoterPost === "number" && !d.promoterPost) patch.promoterPost = ex.promoterPost;
  if (typeof ex.freshIssuePct === "number" && !d.freshIssuePct) patch.freshIssuePct = ex.freshIssuePct;
  return { patch, searches: 1 };
}

/** Days until open (negative = opened). Used for T-2 priority ordering. */
export function daysToOpen(d: IpoSeed, now = Date.now()): number | null {
  if (!d.openDate) return null;
  return Math.ceil((new Date(d.openDate).getTime() - now) / 86400000);
}
