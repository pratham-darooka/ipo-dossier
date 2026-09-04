// OSINT scrapers — primary sources first, aggregators second.
// Each returns normalized partial rows; /api/cron/scrape merges + upserts to Neon.
// All fetches have UA + timeout + graceful null so one dead source never kills a cron run.

import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function get(url: string, ms = 12000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/json" }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

export type ScrapedIpo = {
  source: string;
  company?: string;
  statusHint?: string;
  openDate?: string;
  closeDate?: string;
  priceMin?: number;
  priceMax?: number;
  gmpValue?: number;
  gmpPct?: number;
  subscriptionTotal?: number;
  url?: string;
};

// 1) NSE upcoming issues (CSV download) — closest to truth for dates/sizes
export async function scrapeNSE(): Promise<ScrapedIpo[]> {
  const csv = await get("https://www.nseindia.com/api/all-upcoming-issues?category=ipo");
  if (!csv) return [];
  try {
    const j = JSON.parse(csv);
    const rows = j?.data ?? j ?? [];
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 30).map((r: Record<string, string>) => ({
      source: "nse",
      company: String(r.companyName ?? r.symbol ?? "").trim() || undefined,
      statusHint: String(r.status ?? "").trim() || undefined,
      openDate: r.issueStartDate, closeDate: r.issueEndDate,
    }));
  } catch {
    return [];
  }
}

// 2) Chittorgarh mainboard dashboard — bestтол HTML for band/lot/dates
export async function scrapeChittorgarh(): Promise<ScrapedIpo[]> {
  const html = await get("https://www.chittorgarh.com/ipo/ipo_dashboard.asp");
  if (!html) return [];
  const $ = cheerio.load(html);
  const out: ScrapedIpo[] = [];
  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td").map((_, td) => $(td).text().trim()).get();
    if (tds.length >= 2 && tds[0].length > 2) {
      out.push({ source: "chittorgarh", company: tds[0].slice(0, 80), statusHint: tds[1]?.slice(0, 60) });
    }
  });
  return out.slice(0, 40);
}

// 3) GMP aggregators (unofficial by definition — stored with timestamp, never scored as fundamental)
export async function scrapeGMP(): Promise<ScrapedIpo[]> {
  const urls = ["https://www.gmpipowatch.in/", "https://ipowatch.in/ipo-gmp-grey-market-premium/"];
  const out: ScrapedIpo[] = [];
  for (const u of urls) {
    const html = await get(u);
    if (!html) continue;
    const $ = cheerio.load(html);
    $("table tr").each((_, tr) => {
      const cells = $(tr).find("td").map((_, td) => $(td).text().replace(/\s+/g, " ").trim()).get();
      if (cells.length >= 3) {
        const gmpNum = Number((cells[2] ?? "").replace(/[^0-9.\-]/g, ""));
        if (cells[0] && Number.isFinite(gmpNum)) {
          out.push({ source: "gmp", company: cells[0].slice(0, 80), gmpValue: gmpNum, url: u });
        }
      }
    });
    if (out.length) break;
  }
  return out.slice(0, 40);
}

// 4) SEBI DRHP pipeline — weekly processing status (PDF/HTML). We capture count + link; full parse happens in AI step.
export async function scrapeSEBI(): Promise<{ count: number; url: string } | null> {
  const html = await get("https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=12");
  if (!html) return null;
  return { count: (html.match(/Draft Offer Documents/gi) ?? []).length, url: "https://www.sebi.gov.in" };
}

export async function scrapeAll() {
  const [nse, chit, gmp, sebi] = await Promise.all([scrapeNSE(), scrapeChittorgarh(), scrapeGMP(), scrapeSEBI()]);
  return { nse, chittorgarh: chit, gmp, sebi, at: new Date().toISOString() };
}
