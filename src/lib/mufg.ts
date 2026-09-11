import { normName } from "./nse";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const BASE = "https://in.mpms.mufg.com/Initial_Offer";

export type MufgEntry = { id: string; name: string };

/**
 * MUFG Intime's live allotment dropdown has a public, captcha-free JSON endpoint.
 * If a company is listed here, its basis is published and the dropdown WILL show it.
 * If not, the basis isn't uploaded yet — this is the honest answer to
 * "why isn't my IPO in the dropdown".
 */
export async function fetchMufgDropdown(): Promise<MufgEntry[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch(`${BASE}/IPO.aspx/GetDetails`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Referer: `${BASE}/public-issues.html`,
      },
      body: "{}",
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = (await r.json()) as { d?: string };
    const out: MufgEntry[] = [];
    for (const m of (j.d ?? "").matchAll(/<company_id>(\d+)<\/company_id>\s*<companyname>([^<]+)<\/companyname>/g)) {
      out.push({ id: m[1], name: m[2].trim() });
    }
    return out;
  } catch {
    return [];
  }
}

/** Basis PDFs live at a predictable per-company URL. 200 = published. */
export async function basisPdfLive(companyId: string): Promise<string | null> {
  const url = `${BASE}/PDF/${companyId}/BasisOfAllotment.pdf`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    // Range request: prove existence without downloading megabytes
    const r = await fetch(url, { headers: { "User-Agent": UA, Range: "bytes=0-0" }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    return r.status === 200 || r.status === 206 ? url : null;
  } catch {
    return null;
  }
}

export function matchMufg(company: string, list: MufgEntry[]): MufgEntry | null {
  const key = normName(company);
  return list.find((e) => normName(e.name.replace(/\s*-\s*(IPO|SME IPO|FPO)\s*$/i, "")) === key) ?? null;
}
