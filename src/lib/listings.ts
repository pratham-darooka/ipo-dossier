import { groqSummarize } from "./ai/groq";

// Past-IPO truth: listing-day price/gain/date. NSE's quote & historical APIs are
// Akamai-walled server-side, so we resolve via Tavily (budgeted, cached in Neon).

export type ListingFacts = {
  price: number | null;
  gainPct: number | null;
  date: string | null;
  source: string | null;
};

async function tsearch(query: string, maxResults = 5): Promise<{ title: string; url: string; content: string }[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, topic: "news", search_depth: "basic", max_results: maxResults, include_answer: true, answer: `What was the NSE listing price and listing gain of the ${query}? Reply in one line.` }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = (await r.json()) as { results?: { title?: string; url?: string; content?: string }[]; answer?: string };
    const out = (j.results ?? []).map((h) => ({ title: h.title ?? "", url: h.url ?? "", content: (h.content ?? "").slice(0, 800) }));
    if (j.answer) out.unshift({ title: "tavily-answer", url: "", content: j.answer.slice(0, 400) });
    return out;
  } catch {
    return [];
  }
}

function parseListing(snippets: { content: string }[], priceMax: number): { price: number | null; gainPct: number | null } {
  for (const s of snippets) {
    // "listed at ₹465 ... 63% premium" / "debuted at Rs 131, up 35%" / "list at 10% discount"
    const price = s.content.match(/(?:list(?:ed|ing)|debut)[^\d₹]{0,30}₹\s?([\d,]+(?:\.\d+)?)/i);
    const pct = s.content.match(/([+-]?\d+(?:\.\d+)?)\s?%\s?(?:premium|gain|higher|up|listing gain|discount)/i)
      ?? s.content.match(/(?:premium|gain|up|jumped|soared|discount)[^\d]{0,20}([+-]?\d+(?:\.\d+)?)\s?%/i);
    if (price) {
      const p = Number(price[1].replace(/,/g, ""));
      if (p > 0 && p < priceMax * 5) {
        let g: number | null = null;
        if (pct) g = /discount/i.test(pct[0]) ? -Math.abs(Number(pct[1])) : Number(pct[1]);
        if (g == null) g = Math.round(((p - priceMax) / priceMax) * 1000) / 10;
        return { price: p, gainPct: g };
      }
    }
  }
  return { price: null, gainPct: null };
}

/** One-time/backfill use (and nightly for fresh listings). ~1 Tavily search per IPO. */
export async function resolveListing(company: string, priceMax: number): Promise<ListingFacts> {
  const hits = await tsearch(`${company} IPO listing price NSE debut`);
  if (!hits.length) return { price: null, gainPct: null, date: null, source: null };
  const { price, gainPct } = parseListing(hits, priceMax || 500);
  let date: string | null = null;
  const dm = hits.map((h) => h.content.match(/(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?20\d{2})/i)?.[1]).find(Boolean);
  if (dm) {
    const d = new Date(dm);
    if (!Number.isNaN(+d)) date = d.toISOString().slice(0, 10);
  }
  // LLM cross-check when regex disagrees with Tavily's own answer line
  const ans = hits.find((h) => h.title === "tavily-answer");
  if (price == null && ans) {
    const checked = await groqSummarize(
      "Extract the NSE listing price (number only) from this answer. Reply with just the number or UNKNOWN.",
      ans.content
    );
    const n = checked?.match(/[\d,]+(?:\.\d+)?/)?.[0];
    if (n) {
      const p = Number(n.replace(/,/g, ""));
      if (p > 0 && p < (priceMax || 500) * 5) {
        return { price: p, gainPct: priceMax ? Math.round(((p - priceMax) / priceMax) * 1000) / 10 : null, date, source: hits[1]?.url ?? null };
      }
    }
  }
  return { price, gainPct, date, source: hits.find((h) => h.title !== "tavily-answer")?.url ?? null };
}
