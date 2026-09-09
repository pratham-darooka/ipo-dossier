import { NextResponse } from "next/server";
import { groqJson } from "@/lib/ai/groq";
import { listDrafts, saveDraft } from "@/lib/social/log";
import { EVERGREEN } from "@/lib/social/evergreen";

export const dynamic = "force-dynamic";

const PILLARS = ["IPO sense", "Forensics", "Valuation", "Money basics", "Live tape", "Receipts", "Calendar"] as const;
const TEMPLATES = ["numbered", "duel", "stat", "checklist", "timeline", "mythfact"] as const;

// POST /api/social/generate { pillar?, level? } — Groq drafts a NEW evergreen post
// avoiding all existing titles (bank + drafts). Saved to Neon drafts. Gated by middleware.
export async function POST(req: Request) {
  const { pillar, level } = (await req.json().catch(() => ({}))) as { pillar?: string; level?: string };
  const drafts = await listDrafts();
  const existing = [...EVERGREEN.map((e) => e.cover), ...drafts.map((d) => String((d.payload as Record<string, unknown>).cover ?? ""))].filter(Boolean);

  const draft = await groqJson(
    `You write Instagram carousel copy for Indian retail investors. Audience: mix of first-time investors and market regulars. Compliance is non-negotiable: educational only, never guaranteed returns, never direct buy/sell tips, always frame GMP as unofficial sentiment when mentioned. Voice: sharp, specific, zero fluff — every line must teach something checkable. Return STRICT JSON only, no fences, no preamble: {"cover": "punchy hook ≤60 chars, curiosity + concrete noun", "sub": "one clarifying line ≤90 chars", "pillar": "one of ${PILLARS.join("|")}", "level": "beginner|expert", "template": "one of ${TEMPLATES.join("|")}", "points": ["exactly 4 lines, each ≤110 chars, each self-contained and specific — numbers, thresholds, named mechanics"], "cta": "one action line ≤120 chars, save/share/comment trigger", "versus": {"a": "...", "aSub": "...", "b": "...", "bSub": "...", "verdict": "..."}, "stat": {"big": "≤6 chars, the number", "small": "≤140 chars context"}, "mythfact": {"myth": "common wrong belief ≤110 chars", "fact": "correction with a concrete number ≤140 chars"}}. Include versus ONLY for duel, stat ONLY for stat, mythfact ONLY for mythfact. Match template to message: comparisons->duel, single shocking number->stat, action lists->checklist, processes->timeline, misconceptions->mythfact. Never repeat these topics: ${existing.slice(0, 40).join(" || ")}`,
    `Write one fresh post. ${pillar ? `Pillar: ${pillar}.` : "Pick the pillar with most headroom."} ${level ? `Level: ${level}.` : "Alternate: prefer expert if recent posts skew beginner."} Constraints: reading grade ≤ 8 for beginner, jargon allowed for expert; at least one concrete number (multiple, %, ₹, days); CTA must name the save or the tag ("screenshot this", "tag someone who…").`
  );
  if (!draft || typeof draft.cover !== "string") {
    return NextResponse.json({ ok: false, error: "generation failed, retry" }, { status: 502 });
  }
  const id = `draft-${Date.now().toString(36)}`;
  const payload = { id, ...draft };
  await saveDraft(id, payload);
  return NextResponse.json({ ok: true, draft: payload });
}

// GET /api/social/generate — list drafts (gated).
export async function GET() {
  return NextResponse.json({ ok: true, drafts: await listDrafts() });
}
