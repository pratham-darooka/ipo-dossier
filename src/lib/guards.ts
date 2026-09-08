// Self-healing invariants for the IPO pipeline.
// PURE functions, zero imports — unit-testable with plain node (see prove-guards.mjs pattern).
// Every automated write must pass through here. Violations skip the write and get
// logged to heartbeat.anomalies[] instead of silently corrupting a dossier.

export type Anomaly = { at: string; kind: string; slug: string; detail: string };

const now = () => new Date().toISOString();

/** Normalize once more for matching: & -> and, standalone co -> company. */
export function aliasNorm(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bco\b/g, "company")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard token overlap 0..1 for near-dup detection. */
export function tokenOverlap(a: string, b: string): number {
  const ta = new Set(aliasNorm(a).split(" ").filter(Boolean));
  const tb = new Set(aliasNorm(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export type Sub = { qib: number; nii: number; retail: number; employee: number; total: number };

/**
 * Bidding is cumulative within a window: a LOWER total later is always stale data.
 * Returns the merged subscription (keeps best-known splits) + whether it changed.
 */
export function guardSubscription(prev: Sub, totalX: number | null | undefined): { sub: Sub; changed: boolean; anomaly?: Anomaly } {
  if (totalX == null || !(totalX > 0)) return { sub: prev, changed: false };
  const next = Math.round(totalX * 100) / 100;
  if (prev.total > 0 && next < prev.total) {
    return {
      sub: prev,
      changed: false,
      anomaly: { at: now(), kind: "downgrade-blocked", slug: "", detail: `subscription ${prev.total}x -> ${next}x rejected (bidding is cumulative)` },
    };
  }
  if (next === prev.total) return { sub: prev, changed: false };
  return { sub: { ...prev, total: next }, changed: true };
}

/** Listing price must be sane vs the band. Estimates are rejected upstream; this is the backstop. */
export function guardListingPrice(price: number | null, gainPct: number | null, priceMax: number): { ok: boolean; reason?: string } {
  if (price == null || !(price > 0)) return { ok: false, reason: "no price" };
  if (priceMax > 0 && (price > priceMax * 3 || price < priceMax * 0.2)) {
    return { ok: false, reason: `price ₹${price} implausible vs band top ₹${priceMax}` };
  }
  if (gainPct != null && Math.abs(gainPct) > 400) return { ok: false, reason: `gain ${gainPct}% implausible` };
  return { ok: true };
}

/** Band moves >15% are rejections-with-flag, not silent writes (splits/revisions need eyes). */
export function guardBand(prevMax: number, nextMax: number | null): { ok: boolean; reason?: string } {
  if (nextMax == null || !(nextMax > 0)) return { ok: false, reason: "no band" };
  if (prevMax > 0 && Math.abs(nextMax - prevMax) / prevMax > 0.15) {
    return { ok: false, reason: `band jump ₹${prevMax} -> ₹${nextMax} needs review` };
  }
  return { ok: true };
}

const STATUS_RANK: Record<string, number> = { upcoming: 0, live: 1, listed: 2, allotted: 2 };

/** Status never regresses (live -> upcoming, listed -> live). */
export function guardStatus(prev: string, next: string): { ok: boolean; reason?: string } {
  const a = STATUS_RANK[prev] ?? 0;
  const b = STATUS_RANK[next] ?? 0;
  if (b < a) return { ok: false, reason: `status regression ${prev} -> ${next}` };
  return { ok: true };
}
