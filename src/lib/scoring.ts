// Deterministic 0–10 scores. GMP NEVER feeds the long-term score.
// Listing score: demand (subscription, anchor, GMP trend) 45% + structure 20% + financial momentum 20% + governance 15%
// Long-term score: financial quality 35% + valuation vs peers 25% + governance/forensics 25% + use-of-proceeds 15%

export type ScoreInput = {
  subscriptionTotal?: number; // e.g. 21.6x
  qib?: number;
  gmpPct?: number; // e.g. 96 for +96%
  freshIssuePct?: number; // 0-100
  promoterPost?: number;
  revenueGrowth3y?: number; // % CAGR proxy
  patMargin?: number; // %
  cfoVsPat?: number; // CFO/PAT ratio, 1 = healthy
  peVsPeers?: number; // +ve = expensive vs peers, -ve = cheap. e.g. +20 means 20% premium
  redFlags?: number; // 0-5 count
  anchorPct?: number; // % of issue anchored
  debtEquity?: number;
};

const clamp = (v: number, lo = 0, hi = 10) => Math.min(hi, Math.max(lo, v));

export function scoreListing(i: ScoreInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 5;

  if (i.subscriptionTotal != null) {
    if (i.subscriptionTotal > 50) { s += 2.2; reasons.push(`Monster demand ${i.subscriptionTotal}x — crowd is chasing`); }
    else if (i.subscriptionTotal > 10) { s += 1.5; reasons.push(`Strong demand ${i.subscriptionTotal}x`); }
    else if (i.subscriptionTotal > 2) { s += 0.6; reasons.push(`Decent demand ${i.subscriptionTotal}x`); }
    else if (i.subscriptionTotal < 1) { s -= 1.2; reasons.push(`Undersubscribed — weak listing setup`); }
  }
  if (i.qib != null) {
    if (i.qib > 30) { s += 1.0; reasons.push(`QIB ${i.qib}x — smart money in`); }
    else if (i.qib < 1) { s -= 1.0; reasons.push(`QIB <1x — institutions unimpressed`); }
  }
  if (i.gmpPct != null) {
    if (i.gmpPct > 50) { s += 1.2; reasons.push(`GMP +${i.gmpPct}% — euphoric (crowded)`); }
    else if (i.gmpPct > 15) { s += 0.7; reasons.push(`GMP +${i.gmpPct}% supports listing pop`); }
    else if (i.gmpPct < 0) { s -= 1.0; reasons.push(`GMP negative — expect discount listing`); }
  }
  if (i.anchorPct != null && i.anchorPct > 20) { s += 0.4; reasons.push(`Anchors took ${i.anchorPct}% — confident`); }
  if (i.freshIssuePct != null && i.freshIssuePct < 25) { s -= 0.3; reasons.push(`Mostly OFS — promoters cashing out`); }

  return { score: Math.round(clamp(s) * 10) / 10, reasons: reasons.slice(0, 4) };
}

export function scoreLongTerm(i: ScoreInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 5;

  if (i.revenueGrowth3y != null) {
    if (i.revenueGrowth3y > 25) { s += 1.4; reasons.push(`${i.revenueGrowth3y}% revenue CAGR — real growth`); }
    else if (i.revenueGrowth3y > 12) { s += 0.7; reasons.push(`${i.revenueGrowth3y}% growth — healthy`); }
    else if (i.revenueGrowth3y < 0) { s -= 1.2; reasons.push(`Revenue shrinking — avoid for long term`); }
  }
  if (i.patMargin != null) {
    if (i.patMargin > 15) { s += 0.9; reasons.push(`${i.patMargin}% PAT margin — pricing power`); }
    else if (i.patMargin < 3) { s -= 0.8; reasons.push(`Thin ${i.patMargin}% margins — fragile`); }
  }
  if (i.cfoVsPat != null) {
    if (i.cfoVsPat < 0.5) { s -= 1.4; reasons.push(`Profit not converting to cash — biggest red flag`); }
    else if (i.cfoVsPat > 0.9) { s += 0.7; reasons.push(`Cash-backed profits — quality earnings`); }
  }
  if (i.peVsPeers != null) {
    if (i.peVsPeers > 40) { s -= 1.1; reasons.push(`${i.peVsPeers}% costlier than peers — overpriced`); }
    else if (i.peVsPeers < -10) { s += 0.8; reasons.push(`${Math.abs(i.peVsPeers)}% cheaper than peers — value`); }
  }
  if (i.redFlags != null && i.redFlags > 0) { s -= Math.min(2, i.redFlags * 0.6); reasons.push(`${i.redFlags} forensic red flags in DRHP footnotes`); }
  if (i.debtEquity != null && i.debtEquity > 2) { s -= 0.6; reasons.push(`Leverage ${i.debtEquity}x D/E — risky`); }
  if (i.freshIssuePct != null) {
    if (i.freshIssuePct > 60) { s += 0.5; reasons.push(`${i.freshIssuePct}% fresh capital funds growth`); }
    else if (i.freshIssuePct < 20) { s -= 0.5; reasons.push(`Barely any fresh capital — not funding growth`); }
  }

  return { score: Math.round(clamp(s) * 10) / 10, reasons: reasons.slice(0, 4) };
}

export function verdict(score: number): "APPLY" | "NEUTRAL" | "AVOID" {
  if (score >= 7) return "APPLY";
  if (score >= 5) return "NEUTRAL";
  return "AVOID";
}
