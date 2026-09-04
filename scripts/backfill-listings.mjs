// One-time: resolve listing-day facts for past IPOs (Aug 2026+) missing them.
// Self-contained (plain node, no TS imports).
// Usage: node scripts/backfill-listings.mjs   (reads DATABASE_URL + TAVILY_API_KEY + GROQ_API_KEY from .env)
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^(DATABASE_URL|TAVILY_API_KEY|GROQ_API_KEY)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}

const { neon } = await import("@neondatabase/serverless");

async function tsearch(query) {
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, topic: "news", search_depth: "basic", max_results: 5, include_answer: true }),
  });
  if (!r.ok) return [];
  const j = await r.json();
  const out = (j.results ?? []).map((h) => ({ title: h.title ?? "", url: h.url ?? "", content: (h.content ?? "").slice(0, 800) }));
  if (j.answer) out.unshift({ title: "tavily-answer", url: "", content: String(j.answer).slice(0, 400) });
  return out;
}

async function resolveListing(company, priceMax) {
  const hits = await tsearch(`${company} IPO listing price NSE debut`);
  if (!hits.length) return null;
  const ans = hits.find((h) => h.title === "tavily-answer")?.content ?? "";
  const ansPct = ans.match(/([+-]?\d+(?:\.\d+)?)\s?%/)?.[1];
  for (const s of hits) {
    const price = s.content.match(/(?:list(?:ed|ing)|debut)[^\d₹]{0,30}₹\s?([\d,]+(?:\.\d+)?)/i);
    if (price) {
      const p = Number(price[1].replace(/,/g, ""));
      if (p > 0 && p < (priceMax || 500) * 5) {
        const pct = s.content.match(/([+-]?\d+(?:\.\d+)?)\s?%\s?(?:premium|gain|higher|up|listing gain|discount)/i);
        // Prefer an explicitly stated gain/discount; compute from band only as fallback.
        // Discount headlines ("10% discount") carry a negative sign.
        let g = null;
        if (/discount/i.test(pct?.[0] ?? "") || (/discount/i.test(s.content) && !pct)) {
          const dn = (pct?.[1] ?? s.content.match(/(\d+(?:\.\d+)?)\s?%\s?discount/i)?.[1]);
          g = dn != null ? -Math.abs(Number(dn)) : null;
        } else if (pct) g = Number(pct[1]);
        if (g == null && ansPct != null && /discount/i.test(ans)) g = -Math.abs(Number(ansPct));
        if (g == null && ansPct != null) g = Number(ansPct);
        if (g == null && priceMax) g = Math.round(((p - priceMax) / priceMax) * 1000) / 10;
        const dm = s.content.match(/(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?20\d{2})/i)?.[1];
        let date = null;
        if (dm) { const d = new Date(dm); if (!Number.isNaN(+d)) date = d.toISOString().slice(0, 10); }
        return { price: p, gainPct: g, date, source: hits.find((h) => h.title !== "tavily-answer")?.url ?? null };
      }
    }
  }
  return null;
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT slug, company, status, data FROM ipo WHERE slug != '_pipeline_heartbeat'`;

let fixed = 0;
for (const r of rows) {
  const d = r.data;
  if (r.status !== "listed" || d.listingPrice) continue;
  if (d.closeDate && d.closeDate < "2026-08-01") continue;
  console.log("resolving", d.company);
  try {
    const facts = await resolveListing(d.company, d.priceMax);
    console.log("  ->", JSON.stringify(facts));
    if (facts?.price) {
      d.listingPrice = facts.price;
      if (facts.gainPct != null) d.listingGainPct = facts.gainPct;
      if (facts.date && !d.listingDate) d.listingDate = facts.date;
      d.syncedAt = new Date().toISOString();
      await sql`UPDATE ipo SET data = ${JSON.stringify(d)}::jsonb, updated_at = NOW() WHERE slug = ${r.slug}`;
      fixed++;
    }
  } catch (e) {
    console.log("  ERR", String(e).slice(0, 120));
  }
}
console.log("FIXED:", fixed);
