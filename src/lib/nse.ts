// NSE is the PRIMARY data source (https://www.nseindia.com/market-data/all-upcoming-issues-ipo).
// Two official JSON feeds back that page:
//   all-upcoming-issues?category=ipo -> calendar: dates, price band, issue size, status
//   ipo-current-issue                -> live demand: bids vs offered per symbol (updated through bidding window)

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export type NseUpcoming = {
  symbol: string;
  company: string;
  openDate: string | null;
  closeDate: string | null;
  priceMin: number | null;
  priceMax: number | null;
  issueSizeShares: number | null;
  status: string; // Active | Closed | Forthcoming
};

export type NseLive = {
  symbol: string;
  company: string;
  totalX: number | null;
  bidShares: number | null;
  offeredShares: number | null;
};

async function nseJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://www.nseindia.com/market-data/all-upcoming-issues-ipo" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

function parseBand(s: string | undefined): [number | null, number | null] {
  if (!s) return [null, null];
  const nums = s.replace(/,/g, "").match(/[\d.]+/g)?.map(Number) ?? [];
  if (nums.length >= 2) return [nums[0], nums[1]];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [null, null];
}

// "01-Sep-2026" -> ISO. NSE dates are IST calendar days; noon-UTC keeps the same date in IST.
function parseNseDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const mm = months[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}T06:30:00.000Z`;
}

export async function fetchNseUpcoming(): Promise<NseUpcoming[]> {
  const j = (await nseJson("https://www.nseindia.com/api/all-upcoming-issues?category=ipo")) as
    | { companyName?: string; symbol?: string; issueStartDate?: string; issueEndDate?: string; issuePrice?: string; issueSize?: string; status?: string }[]
    | null;
  if (!j || typeof j !== "object") return [];
  const rows = Array.isArray(j) ? j : Object.values(j);
  return rows
    .filter((r) => r && typeof r === "object" && (r as { symbol?: string }).symbol)
    .map((r) => {
      const row = r as { companyName?: string; symbol?: string; issueStartDate?: string; issueEndDate?: string; issuePrice?: string; issueSize?: string; status?: string };
      const [priceMin, priceMax] = parseBand(row.issuePrice);
      return {
        symbol: (row.symbol ?? "").trim(),
        company: (row.companyName ?? row.symbol ?? "").trim(),
        openDate: parseNseDate(row.issueStartDate),
        closeDate: parseNseDate(row.issueEndDate),
        priceMin,
        priceMax,
        issueSizeShares: row.issueSize ? Number(String(row.issueSize).replace(/[^0-9]/g, "")) || null : null,
        status: (row.status ?? "").trim(),
      };
    });
}

export async function fetchNseLive(): Promise<NseLive[]> {
  const j = (await nseJson("https://www.nseindia.com/api/ipo-current-issue")) as
    | { companyName?: string; symbol?: string; noOfsharesBid?: string; noOfSharesOffered?: string; noOfTime?: string }[]
    | null;
  if (!Array.isArray(j)) return [];
  return j
    .filter((r) => r?.symbol)
    .map((r) => ({
      symbol: (r.symbol ?? "").trim(),
      company: (r.companyName ?? r.symbol ?? "").trim(),
      totalX: r.noOfTime ? Number(r.noOfTime) || null : null,
      bidShares: r.noOfsharesBid ? Number(String(r.noOfsharesBid).replace(/[^0-9]/g, "")) || null : null,
      offeredShares: r.noOfSharesOffered ? Number(String(r.noOfSharesOffered).replace(/[^0-9]/g, "")) || null : null,
    }));
}

/** Normalize company names for matching ("Deepa Jewellers Limited" ~= "Deepa Jewellers"). */
export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(limited|ltd|private|pvt|india|for profit social enterprise|fpse)\b|[().,‐-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** URL slug from company name. */
export function slugify(s: string): string {
  return normName(s).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ipo";
}

export function nseStatusToOurs(s: string, closeDate: string | null): "live" | "upcoming" | "listed" {
  const t = s.toLowerCase();
  if (t.includes("active")) return "live";
  if (t.includes("forthcoming")) return "upcoming";
  if (t.includes("closed")) {
    // Closed + listing ~T+3: treat recent closes as allotted/listed bucket -> "listed" keeps them visible
    if (closeDate && Date.now() - new Date(closeDate).getTime() < 14 * 86400000) return "listed";
    return "listed";
  }
  return "upcoming";
}
