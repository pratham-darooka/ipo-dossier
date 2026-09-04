import { NextResponse } from "next/server";
import { findIpo } from "@/lib/ipos";
import { scoreListing, scoreLongTerm, verdict } from "@/lib/scoring";
import { groqVerdict } from "@/lib/ai/groq";

export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({}));
  if (!slug) return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });

  const ipo = await findIpo(slug);
  if (!ipo) return NextResponse.json({ ok: false, error: "unknown slug" }, { status: 404 });

  const f = ipo.financials;
  const hasFin = f.length >= 3;
  const growth = hasFin ? Math.round(((f[2].revenueCr / f[0].revenueCr) ** 0.5 - 1) * 100) : undefined;
  const margin = hasFin ? Math.round((f[2].patCr / f[2].revenueCr) * 100) : undefined;
  const cfoPat = hasFin ? f[2].cfoCr / f[2].patCr : undefined;
  const l = scoreListing({ subscriptionTotal: ipo.subscription.total || undefined, qib: ipo.subscription.qib || undefined, gmpPct: ipo.gmp.pct || undefined, anchorPct: ipo.anchorPct || undefined, freshIssuePct: ipo.freshIssuePct || undefined });
  const lt = scoreLongTerm({ revenueGrowth3y: growth, patMargin: margin, cfoVsPat: cfoPat, redFlags: ipo.risks.length > 2 ? 2 : ipo.risks.length || undefined, freshIssuePct: ipo.freshIssuePct || undefined });

  const fallback = {
    listing: { score: l.score, verdict: verdict(l.score), reasons: l.reasons, action: "Apply 1 lot; book 50% on pop, trail rest at cost." },
    longterm: { score: lt.score, verdict: verdict(lt.score), reasons: lt.reasons, action: "Hold only if cash conversion stays >0.9x for 2 quarters." },
    oneLiner: `${ipo.company}: deterministic read — listing ${l.score}/10, long-term ${lt.score}/10.`,
    redFlags: ipo.risks,
  };

  // Groq grounded narrative when key present
  const ai = await groqVerdict({ ...ipo, computed: { growth, margin, listingScore: l.score, longTermScore: lt.score } });
  if (ai) return NextResponse.json({ ok: true, ai: true, verdict: ai });
  return NextResponse.json({ ok: true, ai: false, verdict: fallback, hint: "Add GROQ_API_KEY to .env for LLM narrative" });
}
