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
    `You write Instagram carousel copy for Indian retail investors (SEBI-aware: educational, never guaranteed returns, no buy/sell tips). Return STRICT JSON only, no preamble: {"cover": "punchy ≤60 chars", "sub": "one clarifying line", "pillar": "one of ${PILLARS.join("|")}", "level": "beginner|expert", "template": "one of ${TEMPLATES.join("|")}", "points": ["4 short punchy lines, each ≤110 chars"], "cta": "one action line ≤120 chars", "versus": {"a": "...", "aSub": "...", "b": "...", "bSub": "...", "verdict": "..."}, "stat": {"big": "≤6 chars", "small": "≤140 chars"}, "mythfact": {"myth": "...", "fact": "..."}}. Include versus ONLY for duel template, stat ONLY for stat, mythfact ONLY for mythfact. Concrete numbers over fluff. Never repeat these topics: ${existing.slice(0, 40).join(" || ")}`,
    `Write one fresh post. ${pillar ? `Pillar: ${pillar}.` : "Pick the pillar with most headroom."} ${level ? `Level: ${level}.` : "Alternate: prefer expert if recent posts skew beginner."}`
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
