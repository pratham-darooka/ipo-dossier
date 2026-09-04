import type { IpoSeed } from "../data";
import type { Evergreen } from "./slides";

/**
 * Data-driven freshness engine: posts generated from LIVE Neon rows, so they never
 * repeat — numbers move, new IPOs arrive, the ledger grows. The studio prefers these
 * over the static bank whenever one is available and unposted.
 */

export type GeneratedPost = Evergreen & { generatedFrom: string; validFor: string };

function stat(opts: Partial<Evergreen> & Pick<Evergreen, "id" | "cover"> & { big: string; small: string; generatedFrom: string; validFor: string }): GeneratedPost {
  const { big, small, generatedFrom, validFor, ...rest } = opts;
  return {
    level: "beginner",
    pillar: "Live tape",
    sub: "",
    points: [],
    cta: "Follow for the tape, every day.",
    template: "stat",
    stat: { big, small },
    generatedFrom,
    validFor,
    ...rest,
  } as GeneratedPost;
}

/** Top-demanded open IPO right now. */
export function demandLeader(ipos: IpoSeed[]): GeneratedPost | null {
  const live = ipos.filter((i) => i.status === "live" && i.subscription.total > 0).sort((a, b) => b.subscription.total - a.subscription.total)[0];
  if (!live) return null;
  return stat({
    id: `demand-${live.slug}`,
    level: "beginner",
    pillar: "Live tape",
    cover: `${live.company}, wanted ${live.subscription.total}x over`,
    big: `${live.subscription.total}x`,
    small: `Total demand with QIB at ${live.subscription.qib}x. ${live.gmp.pct > 0 ? `GMP whispers +${live.gmp.pct}%.` : "GMP quiet — watch QIB into close."}`,
    points: [`Retail at ${live.subscription.retail}x — crowd is ${live.subscription.retail > 10 ? "piling in" : "lukewarm"}.`, `Closes ${live.closeDate?.slice(0, 10) ?? "soon"}. Verdicts unlock on the dossier.`],
    cta: "Full demand bars + verdicts — link in bio.",
    generatedFrom: live.slug,
    validFor: live.closeDate?.slice(0, 10) ?? "this week",
  });
}

/** Biggest listing pop on record in our ledger. */
export function biggestPop(ipos: IpoSeed[]): GeneratedPost | null {
  const cands = ipos.filter((i) => i.listingGainPct != null && i.listingGainPct > 0).sort((a, b) => (b.listingGainPct ?? 0) - (a.listingGainPct ?? 0))[0];
  if (!cands) return null;
  return stat({
    id: `pop-${cands.slug}`,
    level: "beginner",
    pillar: "Receipts",
    cover: `+${cands.listingGainPct}% on listing. How?`,
    big: `+${cands.listingGainPct}%`,
    small: `${cands.company} listed at ₹${cands.listingPrice} after ${cands.subscription.total}x demand. The tape called it — direction, at least.`,
    points: [`Pre-list GMP was +${cands.gmp.pct || "?"}% — ledger keeps the receipt.`, "Magnitude is where traders get humbled. Book half on pops."],
    cta: "More receipts on the GMP Truth page — link in bio.",
    generatedFrom: cands.slug,
    validFor: "ledger",
  });
}

/** Countdown to the next opener. */
export function countdown(ipos: IpoSeed[], now = new Date()): GeneratedPost | null {
  const up = ipos
    .filter((i) => i.status === "upcoming" && i.openDate && new Date(i.openDate) > now)
    .sort((a, b) => +new Date(a.openDate!) - +new Date(b.openDate!))[0];
  if (!up) return null;
  const days = Math.ceil((new Date(up.openDate!).getTime() - now.getTime()) / 86400000);
  return stat({
    id: `countdown-${up.slug}`,
    level: "beginner",
    pillar: "Calendar",
    cover: `${up.company} opens in ${days} day${days === 1 ? "" : "s"}`,
    big: `${days}D`,
    small: `${up.openDate!.slice(0, 10)} window${up.priceMax > 0 ? ` · band ₹${up.priceMin}–₹${up.priceMax}` : " · band drops ~a week out"}. Dossier already building.`,
    points: ["Day-1 QIB is the only number that matters early.", "Have your lot math + UPI ready before open."],
    cta: "Read the dossier before Day 1 — link in bio.",
    generatedFrom: up.slug,
    validFor: up.openDate!.slice(0, 10),
  });
}

/** GMP accuracy ledger as a living stat. */
export function ledgerStat(ipos: IpoSeed[]): GeneratedPost | null {
  const withBoth = ipos.filter((i) => i.listingGainPct != null && i.gmp.pct > 0);
  if (withBoth.length < 2) return null;
  const right = withBoth.filter((i) => (i.listingGainPct ?? 0) * i.gmp.pct >= 0).length;
  const pct = Math.round((right / withBoth.length) * 100);
  return stat({
    id: `ledger-${withBoth.length}rows`,
    level: "expert",
    pillar: "Receipts",
    cover: `GMP called ${pct}% of our ledger right`,
    big: `${pct}%`,
    small: `Direction accuracy across ${withBoth.length} tracked listings. Magnitude still routinely missed by ~20 points.`,
    points: ["We publish misses too — that's the edge.", "Size on QIB. Size curiosity on GMP."],
    cta: "Full ledger on the GMP Truth page — link in bio.",
    generatedFrom: "ledger",
    validFor: "ledger",
  });
}

/** All currently-available generated posts, freshest signal first. */
export function generatedPosts(ipos: IpoSeed[], now = new Date()): GeneratedPost[] {
  return [demandLeader(ipos), countdown(ipos, now), biggestPop(ipos), ledgerStat(ipos)].filter((p): p is GeneratedPost => Boolean(p));
}
