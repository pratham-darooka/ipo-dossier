import { NextResponse } from "next/server";
import { getIpo } from "@/lib/data";
import { scoreListing, scoreLongTerm, verdict } from "@/lib/scoring";
import { groqVerdict } from "@/lib/ai/groq";

export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({}));
  if (!slug) return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });

  const ipo = getIpo(slug);
  if (!ipo) return NextResponse.json({ ok: false, error: "unknown slug" }, { status: 404 });

  const growth = Math.round(((ipo.financials[2].revenueCr / ipo.financials[0].revenueCr) ** 0.5 - 1) * 100);
  const margin = Math.round((ipo.financials[2].patCr / ipo.financials[2].revenueCr) * 100);
  const l = scoreListing({ subscriptionTotal: ipo.subscription.total || undefined, qib: ipo.subscription.qib || undefined, gmpPct: ipo.gmp.pct, anchorPct: ipo.anchorPct, freshIssuePct: ipo.freshIssuePct });
  const lt = scoreLongTerm({ revenueGrowth3y: growth, patMargin: margin, cfoVsPat: ipo.financials[2].cfoCr / ipo.financials[2].patCr, redFlags: ipo.risks.length > 2 ? 2 : 1, freshIssuePct: ipo.freshIssuePct });

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
