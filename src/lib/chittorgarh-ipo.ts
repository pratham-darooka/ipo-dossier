import * as cheerio from "cheerio";
import { normName } from "./nse";
import type { IpoSeed } from "./data";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";

async function html(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

const num = (s: string): number => {
  const m = s.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

function cell($: cheerio.CheerioAPI, tr: cheerio.Element): string[] {
  return $(tr).find("th,td").map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get();
}

/** Dashboard per-IPO links: normalized company -> /ipo/<slug>-ipo/<id>/ */
export async function chittorgarhLinks(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const h = await html("https://www.chittorgarh.com/ipo/ipo_dashboard.asp");
  if (!h) return out;
  const $ = cheerio.load(h);
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const m = href.match(/\/ipo\/([a-z0-9-]+-ipo\/\d+\/)/);
    if (!m) return;
    const label = $(a).text().replace(/\s+/g, " ").trim() || m[1];
    const key = normName(label.replace(/\sIPO$/i, ""));
    if (key.length > 3 && !out.has(key)) out.set(key, `https://www.chittorgarh.com/ipo/${m[1]}`);
  });
  return out;
}

export type ChitPatch = Partial<IpoSeed> & { listingDateFound?: string };

/** Parse a Chittorgarh per-IPO page: info, structure, lots, 3-yr financials. All server-rendered. */
export async function parseChittorgarhIpo(url: string): Promise<ChitPatch | null> {
  const h = await html(url);
  if (!h) return null;
  const $ = cheerio.load(h);
  const patch: ChitPatch = {};
  const tables: string[][][] = [];
  $("table").each((_, t) => {
    const rows: string[][] = [];
    $(t).find("tr").each((_, tr) => rows.push(cell($, tr)));
    if (rows.length >= 2) tables.push(rows);
  });

  const flat = tables.map((t) => t.map((r) => r.join(" | ")).join("\n")).join("\n");
  const find = (re: RegExp): string => flat.match(re)?.[1]?.trim() ?? "";

  // Info: band, lot, dates, face value
  const band = find(/Price Band\s*\|\s*₹\s?([\d,]+)\s*to\s*₹\s?([\d,]+)/i);
  if (!band) {
    const b2 = flat.match(/₹\s?([\d,]+)\s*(?:to|-)\s*₹\s?([\d,]+)/);
    if (b2) {
      const lo = num(b2[1]);
      const hi = num(b2[2]);
      if (lo > 0 && hi >= lo) {
        (patch as Record<string, unknown>).priceMin = lo;
        (patch as Record<string, unknown>).priceMax = hi;
      }
    }
  } else {
    const m = flat.match(/Price Band\s*\|\s*₹\s?([\d,]+)\s*to\s*₹\s?([\d,]+)/i)!;
    (patch as Record<string, unknown>).priceMin = num(m[1]);
    (patch as Record<string, unknown>).priceMax = num(m[2]);
  }
  const lot = find(/Lot Size\s*\|\s*([\d,]+)/i) || find(/Retail \(Min\)\s*\|\s*1\s*\|\s*([\d,]+)/i);
  if (num(lot) > 0) (patch as Record<string, unknown>).lotSize = num(lot);
  const listDate = find(/Listing Date\s*\|\s*([A-Za-z]{3},\s*[A-Za-z]{3}\s*\d{1,2},?\s*\d{4})/i);
  if (listDate) {
    const d = new Date(listDate.replace(/^[A-Za-z]{3},\s*/, ""));
    if (!Number.isNaN(+d)) patch.listingDateFound = d.toISOString().slice(0, 10);
  }

  // Fresh vs OFS from share counts
  const fresh = find(/Fresh Issue\s*\|\s*([\d,]+)\s*shares/i);
  const ofs = find(/Offer for Sale\s*\|\s*([\d,]+)\s*shares/i);
  if (num(fresh) > 0 && num(ofs) >= 0) {
    (patch as Record<string, unknown>).freshIssuePct = Math.round((num(fresh) / (num(fresh) + num(ofs))) * 1000) / 10;
  }

  // Financials: find the table with a year header + Total Income + PAT rows
  for (const t of tables) {
    const head = t[0].join(" ");
    if (!/20\d{2}/.test(head)) continue;
    const years = t[0].slice(1).map((c) => {
      const y = c.match(/20(\d{2})/)?.[1];
      return y ? `FY${y}` : "";
    });
    if (years.filter(Boolean).length < 2) continue;
    const row = (label: RegExp) => t.find((r) => label.test(r[0]));
    const income = row(/total income|revenue/i);
    const pat = row(/profit after tax/i);
    if (!income || !pat) continue;
    const fins = years
      .map((fy, i) => {
        if (!fy) return null;
        const rev = num(income[i + 1] ?? "");
        const p = num(pat[i + 1] ?? "");
        // Parentheses = negative in Indian accounts
        const neg = (s: string) => /\(.*\)/.test(s);
        return {
          fy,
          revenueCr: Math.round(rev * 100) / 100,
          patCr: neg(pat[i + 1] ?? "") ? -Math.abs(p) : p,
          roe: 0,
          roce: 0,
          de: 0,
          cfoCr: 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x) && x.revenueCr > 0);
    if (fins.length >= 2) {
      patch.financials = fins.slice(-3);
      (patch as Record<string, unknown>).finSource = "rhp";
      break;
    }
  }
  return Object.keys(patch).length ? patch : null;
}
