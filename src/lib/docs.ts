import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractText } from "unpdf";
import { groqExtractFiling } from "./ai/groq";
import type { IpoSeed } from "./data";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

async function tsearchPdfs(company: string): Promise<string[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: `${company} IPO RHP red herring prospectus PDF`,
        search_depth: "basic",
        max_results: 8,
        include_domains: ["sebi.gov.in", "bseindia.com", "nseindia.com", "chittorgarh.com"],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = (await r.json()) as { results?: { url?: string }[] };
    const urls = (j.results ?? []).map((h) => h.url ?? "").filter(Boolean);
    return [...urls.filter((u) => u.toLowerCase().includes(".pdf")), ...urls.filter((u) => !u.toLowerCase().includes(".pdf"))];
  } catch {
    return [];
  }
}

/** Find an offer-document URL for a company (cached on the row as docUrl once found). */
export async function resolveDocUrl(company: string): Promise<string | null> {
  const urls = await tsearchPdfs(company);
  return urls[0] ?? null;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function mergeFin(base: IpoSeed["financials"], add: unknown): IpoSeed["financials"] {
  if (!Array.isArray(add)) return base;
  const byFy = new Map(base.map((r) => [r.fy, r]));
  for (const r of add as Record<string, unknown>[]) {
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
 * Full deep-dive: download PDF to /tmp, extract text (no OCR), structure via Groq,
 * ALWAYS delete the file afterwards (DB storage stays tiny — only JSON survives).
 * Returns patch fields for the dossier row, or null on any failure.
 */
export async function deepDiveDoc(company: string, docUrl: string): Promise<Partial<IpoSeed> | null> {
  const tmp = path.join(os.tmpdir(), `dossier-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const r = await fetch(docUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const len = Number(r.headers.get("content-length") || 0);
    if (len > MAX_PDF_BYTES) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_PDF_BYTES || buf.length < 1024) return null;
    await fs.writeFile(tmp, buf);

    const { text } = await extractText(buf);
    const full = (Array.isArray(text) ? text.join("\n") : String(text)).slice(0, 60000);
    if (full.trim().length < 2000) return null; // scanned-image PDF — OCR explicitly out of scope

    // Chunk so long RHPs survive model context limits; merge facts across chunks.
    const chunks = [full.slice(0, 20000), full.slice(20000, 40000), full.slice(40000, 60000)].filter((c) => c.trim().length > 1000);
    const patch: Partial<IpoSeed> = {};
    const finAll: IpoSeed["financials"] = [];
    const risks = new Set<string>();
    const objects = new Set<string>();
    for (const c of chunks.slice(0, 3)) {
      const ex = await groqExtractFiling(c);
      if (!ex) continue;
      if (Array.isArray(ex.financials)) for (const fr of mergeFin(finAll, ex.financials)) if (!finAll.find((x) => x.fy === fr.fy)) finAll.push(fr);
      if (Array.isArray(ex.risks)) for (const x of ex.risks.slice(0, 8)) if (typeof x === "string" && x.length > 10) risks.add(x.slice(0, 220));
      if (Array.isArray(ex.objectsOfIssue)) for (const x of ex.objectsOfIssue.slice(0, 6)) if (typeof x === "string" && x.length > 5) objects.add(x.slice(0, 160));
      if (typeof ex.about === "string" && ex.about.length > 40 && !patch.about) patch.about = ex.about.slice(0, 500);
      if (typeof ex.registrar === "string" && ex.registrar && !patch.registrar) patch.registrar = ex.registrar.slice(0, 60);
      if (Array.isArray(ex.leadManagers) && !patch.leadManagers?.length) patch.leadManagers = ex.leadManagers.filter((x) => typeof x === "string").slice(0, 4) as string[];
      if (typeof ex.promoterPre === "number" && !patch.promoterPre) patch.promoterPre = ex.promoterPre;
      if (typeof ex.promoterPost === "number" && !patch.promoterPost) patch.promoterPost = ex.promoterPost;
      if (typeof ex.freshIssuePct === "number" && !patch.freshIssuePct) patch.freshIssuePct = ex.freshIssuePct;
      if (Array.isArray(ex.peers) && !patch.peers?.length) {
        patch.peers = ex.peers.filter((p) => typeof (p as Record<string, unknown>)?.name === "string").slice(0, 4) as IpoSeed["peers"];
      }
    }
    if (finAll.length) patch.financials = finAll.slice(-3);
    if (risks.size) patch.risks = [...risks].slice(0, 8);
    if (objects.size) patch.objectsOfIssue = [...objects].slice(0, 6);
    patch.partial = !(patch.financials?.length === 3);
    return patch;
  } catch {
    return null;
  } finally {
    await fs.unlink(tmp).catch(() => {}); // storage discipline: doc bytes never survive the run
  }
}
