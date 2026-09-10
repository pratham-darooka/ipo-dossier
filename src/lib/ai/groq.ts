import Groq from "groq-sdk";
import { geminiChat } from "./gemini";
import { openrouterChat } from "./openrouter";

// Primary + fallbacks. If rate limits (or a retired model ID) bite, we rotate.
// qwen thinks out loud — <think> blocks are stripped before parsing.
const MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];

function client() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  // Explicit timeout: SDK default can hang for minutes and kill serverless runs.
  return new Groq({ apiKey: key, timeout: 40000, maxRetries: 1 });
}

function clean(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Repair common model output damage: markdown fences, preamble chatter, trailing
 * commentary, truncated tails. Returns the largest balanced {...} block, else "".
 */
export function extractJson(text: string): string {
  const s = clean(text).replace(/```(?:json)?/gi, "").trim();
  const start = s.indexOf("{");
  if (start < 0) return "";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return ""; // truncated — caller treats as miss and rotates
}

async function chat(opts: { system: string; user: string; maxTokens: number; json?: boolean; temperature?: number; systemCompact?: string }): Promise<string | null> {
  // Provider order: Groq (fast, free) -> Gemini (fallback) -> OpenRouter free-tier (last resort).
  // AI_PROVIDER=groq|gemini|openrouter pins the FIRST attempt (still falls through on failure).
  // Small-model providers receive systemCompact when supplied (they follow short contracts better).
  // Each layer degrades silently; callers only see string | null.
  const pin = (process.env.AI_PROVIDER || "").toLowerCase();
  const order: ("groq" | "gemini" | "openrouter")[] =
    pin === "gemini" ? ["gemini", "groq", "openrouter"]
    : pin === "openrouter" ? ["openrouter", "groq", "gemini"]
    : ["groq", "gemini", "openrouter"];
  for (const p of order) {
    if (p === "groq") {
      const c = client();
      if (c) {
        let lastErr: unknown = null;
        for (const model of MODELS) {
          for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) await new Promise((r) => setTimeout(r, 4000));
            try {
              const res = await c.chat.completions.create({
                model,
                temperature: opts.temperature ?? 0.3,
                max_tokens: opts.maxTokens,
                messages: [
                  { role: "system", content: opts.system },
                  { role: "user", content: opts.user },
                ],
                ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
              });
              const text = clean(res.choices?.[0]?.message?.content ?? "");
              if (text) {
                lastServedBy = `groq:${model}`;
                return text;
              }
            } catch (e) {
              lastErr = e;
              const status = (e as { status?: number })?.status;
              if (status === 404 || status === 400 || status === 401) break; // dead model/key — next model
              continue; // 429/5xx — retry once, then next model
            }
          }
        }
        console.warn("[groq] all models failed", lastErr instanceof Error ? lastErr.message.slice(0, 160) : lastErr);
      }
    } else if (p === "gemini") {
      const g = await geminiChat(opts);
      if (g) {
        lastServedBy = "gemini";
        return g;
      }
    } else {
      const o = await openrouterChat(opts);
      if (o) {
        lastServedBy = "openrouter";
        return o;
      }
    }
  }
  return null;
}

export type VerdictDuo = {
  listing: { score: number; verdict: string; reasons: string[]; action: string };
  longterm: { score: number; verdict: string; reasons: string[]; action: string };
  oneLiner: string;
  redFlags: string[];
};

const SYSTEM = `You are a senior equity research analyst covering Indian mainboard IPOs on NSE/BSE. Your reader is a retail investor deciding whether to apply. You are educational: thorough, specific, never guaranteeing outcomes, never giving assured buy/sell calls.

MARKET MECHANICS YOU MUST RESPECT
- Timeline: 3-day bidding window -> allotment ~T+1 -> listing ~T+3. Retail allotment in oversubscribed issues is a computerised lottery per lot; HNI (NII) allotment is proportional.
- Bidder classes: QIB (institutions, allotted proportionally, bids Day 3 typically, smart money), NII/sNII/bNII (HNI leverage bids), Retail (lottery), Employee (often discounted).
- Demand read: QIB multiple is the strongest quality signal. Total subscription without QIB strength is hype. Day-1 QIB below 1x is a red flag; above 10x is strong.
- GMP (grey market premium) is UNOFFICIAL, unregulated, volatile intraday sentiment — informative, never a promise. A positive GMP can and does invert by listing. Always caveat GMP explicitly when citing it.
- Issue structure: fresh issue % funds the company (growth); OFS % exits promoters/investors. >60% fresh is a green flag; <25% fresh means you are mostly buying someone out.
- Valuation: compare against listed peers on PE/PB/ROE, never in isolation. A 20%+ premium to peers needs visibly superior growth or margins.
- Earnings quality: CFO/PAT near 1.0 = cash-backed profits. Below 0.5 sustained = profits not converting — a major red flag. Thin sub-3% PAT margins in commodity businesses are fragile.
- Promoters: high post-issue holding (65%+) aligns incentives; heavy pre-IPO placements or large OFS = exit smell. Related-party exposure and contingent liabilities live in DRHP footnotes — surface them.

SCORING RUBRIC (0-10 each, one decimal allowed)
- Listing score: subscription momentum 40% (total + QIB weight), GMP trend 20%, anchor quality 15%, issue size/liquidity 10%, market/sector mood 15%. 8+ = strong pop setup; 5-7 = conditional; below 5 = skip for listing.
- Long-term score: revenue growth + margin trajectory 30%, cash conversion 20%, valuation vs peers 20%, promoter/governance 15%, use of proceeds 15%. 8+ = compounder candidate; 5-7 = watchlist; below 5 = avoid for portfolio.

GROUNDING RULES (VIOLATIONS INVALIDATE YOUR ANSWER)
- Use ONLY numbers present in the user JSON. Never invent subscription figures, financials, peers, dates, or GMP.
- A value of 0, null, or missing means NOT DISCLOSED YET — say so explicitly ("QIB not disclosed yet") and score that dimension neutral (5/10 contribution), never zero, never optimistic.
- If subscription.total is 0 and status is upcoming, the issue hasn't opened: judge the listing setup on structure + valuation only, and say the demand verdict unlocks Day 1.
- If the company already listed (listingPrice present), the listing verdict is retrospective — grade the call, don't pretend to predict it.
- Keep every reason under 140 characters, specific (cite the number), no filler, no repetition across reasons.

OUTPUT CONTRACT — STRICT JSON ONLY, no markdown fences, no preamble, no trailing commentary:
{"listing":{"score":n,"verdict":"APPLY|NEUTRAL|AVOID","reasons":["r1","r2","r3"],"action":"..."},"longterm":{"score":n,"verdict":"APPLY|NEUTRAL|AVOID","reasons":["r1","r2","r3"],"action":"..."},"oneLiner":"single sentence capturing the essence, ≤160 chars","redFlags":["concrete risk 1","concrete risk 2"]}
- Exactly 3 reasons per side. Verdict thresholds: score >= 7 APPLY, 5-7 NEUTRAL, below 5 AVOID.
- Actions must be concrete and horizon-correct. Listing example: "Apply 1 lot; book 50% on a 30%+ pop, trail rest at cost." Long-term example: "Skip at this valuation; revisit 2 quarters post-listing under ₹X if margins hold."
- redFlags: only concrete, filing-grounded risks (concentration %, leverage, litigation, RPT exposure). Empty array if none — never pad.`;

export async function groqVerdict(ipoJson: unknown): Promise<VerdictDuo | null> {
  const text = await chat({
    system: SYSTEM,
    // Compact contract for small-model providers: same rules, shorter brief.
    systemCompact: `You are a senior equity analyst for Indian mainboard IPOs (NSE/BSE). Reader: retail investor. Educational only — never guarantee outcomes, never give assured buy/sell calls.
MECHANICS: 3-day bidding; retail allotment is a lottery when oversubscribed; QIB multiple = strongest quality signal (Day-1 QIB <1x red flag, >10x strong); GMP is UNOFFICIAL volatile sentiment, never a promise — always caveat it; fresh-issue % funds growth (>60% green flag), OFS % exits holders (<25% fresh = mostly exit); compare valuation vs listed peers, never alone; CFO/PAT near 1.0 = quality, below 0.5 sustained = red flag; promoter holding 65%+ aligns incentives.
SCORING 0-10: listing = demand 40% + GMP 20% + anchors 15% + size 10% + mood 15%. Long-term = growth+margins 30% + cash 20% + valuation 20% + governance 15% + proceeds 15%. >=7 APPLY, 5-7 NEUTRAL, <5 AVOID.
GROUNDING: use ONLY numbers in the user JSON. 0/null/missing = NOT DISCLOSED — say so, score neutral, never invent. Upcoming + total 0 = not opened: judge structure/valuation only, demand unlocks Day 1. Already listed = grade retrospectively.
OUTPUT STRICT JSON ONLY, no fences/preamble: {"listing":{"score":n,"verdict":"APPLY|NEUTRAL|AVOID","reasons":["3 specific reasons ≤140 chars, cite numbers","...","..."],"action":"concrete listing action"},"longterm":{"score":n,"verdict":"APPLY|NEUTRAL|AVOID","reasons":["...","...","..."],"action":"concrete 2-3yr action"},"oneLiner":"essence ≤160 chars","redFlags":["concrete risk"]}. Exactly 3 reasons per side.`,
    user: `Analyze this IPO JSON and return the verdict duo:\n${JSON.stringify(ipoJson).slice(0, 9000)}`,
    maxTokens: 1200,
    json: true,
  });
  if (!text) return null;
  try {
    const v = JSON.parse(extractJson(text) || text) as VerdictDuo;
    if (typeof v?.listing?.score !== "number" || typeof v?.longterm?.score !== "number" || typeof v?.oneLiner !== "string") return null;
    v.listing.score = Math.min(10, Math.max(0, v.listing.score));
    v.longterm.score = Math.min(10, Math.max(0, v.longterm.score));
    if (!Array.isArray(v.listing.reasons)) v.listing.reasons = [];
    if (!Array.isArray(v.longterm.reasons)) v.longterm.reasons = [];
    if (!Array.isArray(v.redFlags)) v.redFlags = [];
    return v;
  } catch {
    return null;
  }
}

export async function groqSummarize(prompt: string, context: string): Promise<string | null> {
  return chat({
    system: "You are a precise financial summarizer for Indian markets. Rules: answer ONLY from the provided context; if the answer is absent say UNKNOWN; numbers must be quoted exactly as written (preserve ₹, %, x multiples); no investment advice; no preamble, no hedging phrases, no trailing commentary — output only the requested artifact.",
    user: `${prompt}\n\nContext (only source of truth):\n${context.slice(0, 12000)}`,
    maxTokens: 1000,
    temperature: 0.4,
  });
}

/** Deep-dive a long filing excerpt into structured JSON (drives dossier enrichment). */
export async function groqExtractFiling(excerpt: string): Promise<Record<string, unknown> | null> {
  const text = await chat({
    system: `You extract structured facts from Indian IPO offer documents. Return STRICT JSON only: {"financials":[{"fy":"FY24","revenueCr":n,"patCr":n,"roe":n,"roce":n,"de":n,"cfoCr":n}],"peers":[{"name":s,"pe":n,"pb":n,"roe":n}],"risks":[s],"objectsOfIssue":[s],"promoterPre":n,"promoterPost":n,"freshIssuePct":n,"anchorCr":n,"registrar":s,"leadManagers":[s],"about":s}. Use null for anything not found. Numbers only, no commas, no currency symbols. anchorCr = anchor book size in Rs crore.`,
    user: `Extract from this offer-document text:\n${excerpt.slice(0, 14000)}`,
    maxTokens: 2000,
    json: true,
    temperature: 0.1,
  });
  if (!text) return null;
  try {
    return JSON.parse(extractJson(text) || text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Generic JSON worker with model fallback (powers the social draft engine). */
export async function groqJson(system: string, user: string, maxTokens = 1200): Promise<Record<string, unknown> | null> {
  const text = await chat({ system, user, maxTokens, json: true, temperature: 0.7 });
  if (!text) return null;
  try {
    return JSON.parse(extractJson(text) || text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

/** Last provider+model that served successfully (process-local, for diagnostics). */
export let lastServedBy: string | null = null;

/** Any AI provider ready (Groq, Gemini, or OpenRouter-free). */
export function aiConfigured() {
  return groqConfigured() || Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) || Boolean(process.env.OPENROUTER_API_KEY);
}
