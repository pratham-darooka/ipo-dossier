import * as cheerio from "cheerio";
import { normName, slugify } from "./nse";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";

export type Forthcoming = { company: string; openDate: string | null; closeDate: string | null };

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function iso(m: number, d: number): string {
  return `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T06:30:00.000Z`;
}

/** "Rentomojo 09 - 11 Sep" / "Purple Style Labs P31 Aug - 02 Sep" -> {company, open, close} */
export function parseBoardCell(cell: string): { company: string; open: string | null; close: string | null } | null {
  const m = cell.match(/^(.+?)\s*[A-Z]{0,3}(\d{1,2})\s*([A-Za-z]{3})?\s*-\s*(\d{1,2})\s*([A-Za-z]{3})$/);
  if (!m) return null;
  const [, rawName, d1, mon1, d2, mon2] = m;
  const m2 = MON[mon2.toLowerCase()];
  if (!m2) return null;
  const m1 = (mon1 && MON[mon1.toLowerCase()]) || m2;
  // Cross-month spans like "31 Aug - 02 Sep": start month may be < end month (assume 2026, Aug-Sep window)
  return { company: rawName.trim(), open: iso(m1, Number(d1)), close: iso(m2, Number(d2)) };
}

/**
 * Chittorgarh mainboard dashboard, table 0 (server-rendered): forthcoming +
 * recently-closed names NSE hasn't listed yet (or already dropped). Supplements NSE.
 */
export async function fetchChittorgarhForthcoming(): Promise<Forthcoming[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch("https://www.chittorgarh.com/ipo/ipo_dashboard.asp", {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const $ = cheerio.load(await r.text());
    const out: Forthcoming[] = [];
    const seen = new Set<string>();
    $("table").first().find("tr").each((_, tr) => {
      const cell = $(tr).find("td").map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get().join(" ");
      const p = parseBoardCell(cell);
      if (p && !seen.has(normName(p.company))) {
        seen.add(normName(p.company));
        out.push({ company: p.company, openDate: p.open, closeDate: p.close });
      }
    });
    return out;
  } catch {
    return [];
  }
}

export { normName, slugify };
