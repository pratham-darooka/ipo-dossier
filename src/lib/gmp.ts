import { probeGmp } from "./tavily";

export type GmpQuote = { value: number; pct: number; source: string; at: string };

/**
 * GMP refresh. Aggregator boards (investorgain/chittorgarh) are JS-walled and
 * return nothing server-side, so the chain is: Tavily snippet probe (reliable,
 * ~1 search per IPO — fits the 1000/mo budget at our IPO counts).
 * Returns null when nothing credible found (caller keeps the old quote + marks stale).
 */
export async function refreshGmp(company: string, symbol: string | undefined, priceMax: number): Promise<GmpQuote | null> {
  const at = new Date().toISOString();

  // 1) Tavily probe (reliable, budgeted ~1 search). Scrapers for JS-walled
  // boards live in lib/scrapers and already degrade to [] — no point re-hitting them here.
  const hit = await probeGmp(`${company}${symbol ? ` ${symbol}` : ""}`, priceMax || 500);
  if (hit) {
    const pct = priceMax ? Math.round(((hit.value / priceMax) * 1000)) / 10 : 0;
    return { value: hit.value, pct, source: hit.source || "tavily", at };
  }
  return null;
}
