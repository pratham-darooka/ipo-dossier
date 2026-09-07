// One-time: Chittorgarh per-IPO pages -> bands, lots, listing dates, fresh/OFS, 3-yr financials.
// Self-contained (plain node). Free, no rate limits. Merge-only-empty.
// Usage: node scripts/chit-backfill.mjs [slug-filter]
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^(DATABASE_URL)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}
const ONLY = (process.argv[2] || "").toLowerCase();
const { neon } = await import("@neondatabase/serverless");
const cheerio = (await import("cheerio")).default ?? (await import("cheerio"));
const load = cheerio.load ?? cheerio;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36";
async function html(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}
const num = (s) => { const m = String(s || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : 0; };
const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\b(limited|ltd|private|pvt|india|for profit social enterprise|fpse)\b|[().,‐-]/gi, " ").replace(/\s+/g, " ").trim();

const sql = neon(process.env.DATABASE_URL);

// 1. dashboard links
const dash = await html("https://www.chittorgarh.com/ipo/ipo_dashboard.asp");
const links = new Map();
if (dash) {
  const $ = load(dash);
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const m = href.match(/\/ipo\/([a-z0-9-]+-ipo\/\d+\/)/);
    if (!m) return;
    const label = ($(a).text() || "").replace(/\s+/g, " ").trim() || m[1];
    const key = norm(label.replace(/\sIPO$/i, ""));
    if (key.length > 3 && !links.has(key)) links.set(key, `https://www.chittorgarh.com/ipo/${m[1]}`);
  });
}
console.log("dashboard links:", links.size);

const rows = await sql`SELECT slug,company,status,data FROM ipo WHERE slug NOT LIKE '_pipeline%'`;
let filled = 0;
for (const r of rows) {
  if (ONLY && !r.slug.toLowerCase().includes(ONLY)) continue;
  const d = r.data;
  const url = links.get(norm(d.company));
  if (!url) { console.log("no chit page:", r.slug); continue; }
  const h = await html(url);
  if (!h) { console.log("fetch fail:", r.slug); continue; }
  const $ = load(h);
  const tables = [];
  $("table").each((_, t) => {
    const rr = [];
    $(t).find("tr").each((_, tr) => rr.push($(tr).find("th,td").map((_, c) => $(c).text().replace(/\s+/g, " ").trim()).get()));
    if (rr.length >= 2) tables.push(rr);
  });
  const flat = tables.map((t) => t.map((x) => x.join(" | ")).join("\n")).join("\n");
  const patch = {};
  let notes = [];
  if (!d.priceMax) {
    const m = flat.match(/Price Band\s*\|\s*₹\s?([\d,]+)\s*to\s*₹\s?([\d,]+)/i) ?? flat.match(/₹\s?([\d,]+)\s*(?:to|-)\s*₹\s?([\d,]+)/);
    if (m && num(m[1]) > 0) { patch.priceMin = num(m[1]); patch.priceMax = num(m[2]); notes.push(`band ${patch.priceMin}-${patch.priceMax}`); }
  }
  if (!d.lotSize) {
    const m = flat.match(/Lot Size\s*\|\s*([\d,]+)/i);
    if (num(m?.[1] ?? "") > 0) { patch.lotSize = num(m[1]); notes.push("lot " + patch.lotSize); }
  }
  if (!d.listingDate) {
    const m = flat.match(/Listing Date\s*\|\s*[A-Za-z]{3},\s*([A-Za-z]{3}\s*\d{1,2},?\s*\d{4})/i);
    if (m) { const dt = new Date(m[1]); if (!Number.isNaN(+dt)) { patch.listingDate = dt.toISOString().slice(0, 10); notes.push("list " + patch.listingDate); } }
  }
  if (!d.freshIssuePct) {
    const fr = flat.match(/Fresh Issue\s*\|\s*([\d,]+)\s*shares/i);
    const of = flat.match(/Offer for Sale\s*\|\s*([\d,]+)\s*shares/i);
    if (fr && num(fr[1]) > 0) { patch.freshIssuePct = Math.round((num(fr[1]) / (num(fr[1]) + num(of?.[1] ?? 0))) * 1000) / 10; notes.push("fresh " + patch.freshIssuePct + "%"); }
  }
  if ((d.financials || []).length < 3) {
    for (const t of tables) {
      if (!/20\d{2}/.test(t[0].join(" "))) continue;
      const years = t[0].slice(1).map((c) => { const y = c.match(/20(\d{2})/)?.[1]; return y ? `FY${y}` : ""; });
      if (years.filter(Boolean).length < 2) continue;
      const row = (re) => t.find((x) => re.test(x[0] || ""));
      const inc = row(/total income|revenue/i), pat = row(/profit after tax/i);
      if (!inc || !pat) continue;
      const fins = [];
      years.forEach((fy, i) => {
        if (!fy) return;
        const rev = num(inc[i + 1] ?? "");
        let p = num(pat[i + 1] ?? "");
        if (/\(.*\)/.test(pat[i + 1] ?? "")) p = -Math.abs(p);
        if (rev > 0) fins.push({ fy, revenueCr: Math.round(rev * 100) / 100, patCr: p, roe: 0, roce: 0, de: 0, cfoCr: 0 });
      });
      if (fins.length >= 2) {
        const byFy = new Map((d.financials || []).map((x) => [x.fy, x]));
        for (const fr2 of fins.slice(-3)) {
          const prev = byFy.get(fr2.fy);
          byFy.set(fr2.fy, { revenueCr: fr2.revenueCr || prev?.revenueCr || 0, patCr: fr2.patCr || prev?.patCr || 0, roe: prev?.roe || 0, roce: prev?.roce || 0, de: prev?.de || 0, cfoCr: prev?.cfoCr || 0, fy: fr2.fy });
        }
        const merged = [...byFy.values()].slice(-3);
        if (JSON.stringify(merged) !== JSON.stringify(d.financials)) { patch.financials = merged; patch.finSource = "rhp"; notes.push(`fins ${merged.map((x) => x.fy).join(",")}`); }
        break;
      }
    }
  }
  if (Object.keys(patch).length) {
    Object.assign(d, patch);
    d.partial = (d.financials?.length ?? 0) === 0;
    d.syncedAt = new Date().toISOString();
    await sql`UPDATE ipo SET data=${JSON.stringify(d)}::jsonb,updated_at=NOW() WHERE slug=${r.slug}`;
    filled++;
    console.log("filled", r.slug, "-", notes.join("; "));
  } else console.log("nothing new", r.slug);
  await new Promise((res) => setTimeout(res, 1500));
}
console.log("DONE filled=" + filled);
