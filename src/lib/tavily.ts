// Tavily web intelligence: news, street opinion, GMP chatter per IPO.
// Budget: free 1000 searches/month (~30/day). Cron callers must cache in Neon
// (news JSON on the row) and never call per page-view.

export type TavilyHit = { title: string; url: string; content: string; publishedDate?: string };

export function tavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

async function tsearch(query: string, opts: { topic?: "news" | "general"; maxResults?: number; days?: number } = {}): Promise<TavilyHit[]> {
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
        query,
        topic: opts.topic ?? "general",
        search_depth: "basic",
        max_results: opts.maxResults ?? 5,
        time_range: opts.days ? "week" : undefined,
        include_answer: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = (await r.json()) as { results?: { title?: string; url?: string; content?: string; published_date?: string }[] };
    return (j.results ?? []).map((h) => ({ title: h.title ?? "", url: h.url ?? "", content: (h.content ?? "").slice(0, 600), publishedDate: h.published_date }));
  } catch {
    return [];
  }
}

/** Street opinion + news digest for one IPO (1-2 searches — cron use only). */
export async function ipoIntel(company: string): Promise<{ news: TavilyHit[]; gmpChatter: TavilyHit[] }> {
  const [news, gmpChatter] = await Promise.all([
    tsearch(`${company} IPO news subscription allotment listing`, { topic: "news", maxResults: 5 }),
    tsearch(`${company} IPO GMP today grey market premium`, { maxResults: 5 }),
  ]);
  return { news, gmpChatter };
}

/** Last-resort GMP probe: extract a ₹ number near "GMP" from search snippets. */
export async function probeGmp(company: string, priceMax: number): Promise<{ value: number; source: string } | null> {
  const hits = await tsearch(`${company} IPO GMP today`, { maxResults: 5 });
  for (const h of hits) {
    const m = h.content.match(/(?:gmp[^₹\d]{0,20})₹\s?([\d,]+)/i) ?? h.content.match(/₹\s?([\d,]+)[^\d]{0,20}gmp/i);
    if (m) {
      const v = Number(m[1].replace(/,/g, ""));
      if (v > 0 && v < priceMax * 3) return { value: v, source: h.url };
    }
  }
  return null;
}
