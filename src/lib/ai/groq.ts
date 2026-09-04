import Groq from "groq-sdk";

// Primary + fallbacks. If rate limits (or a retired model ID) bite, we rotate.
// qwen thinks out loud — <think> blocks are stripped before parsing.
const MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];

function client() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

function clean(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function chat(opts: { system: string; user: string; maxTokens: number; json?: boolean; temperature?: number }): Promise<string | null> {
  const c = client();
  if (!c) return null;
  let lastErr: unknown = null;
  for (const model of MODELS) {
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
      if (text) return text;
    } catch (e) {
      lastErr = e;
      continue; // 429 / 5xx / retired model -> next model
    }
  }
  console.warn("[groq] all models failed", lastErr instanceof Error ? lastErr.message.slice(0, 160) : lastErr);
  return null;
}

export type VerdictDuo = {
  listing: { score: number; verdict: string; reasons: string[]; action: string };
  longterm: { score: number; verdict: string; reasons: string[]; action: string };
  oneLiner: string;
  redFlags: string[];
};

const SYSTEM = `You are an IPO research analyst for Indian mainboard IPOs. You are educational, never give guaranteed buy/sell advice.
Rules:
- Use ONLY the numbers provided in the user JSON. If a field is missing/zero, say "not disclosed yet".
- Treat GMP as unofficial sentiment, never as a guarantee. Warn when GMP diverges from fundamentals.
- Output TWO separate takes: (1) Listing-Gain Trader (3-10 day horizon: GMP trend, subscription esp QIB, anchor, issue size, market mood) (2) Long-Term Investor (2-3yr: growth, margins, cash conversion CFO vs PAT, valuation vs peers, promoter, use of proceeds, risks).
- Scores 0-10. Verdicts: APPLY / NEUTRAL / AVOID.
- Return STRICT JSON only, no markdown, no thinking preamble: {"listing":{"score":n,"verdict":"...","reasons":["...","...","..."],"action":"..."},"longterm":{"score":n,"verdict":"...","reasons":["...","...","..."],"action":"..."},"oneLiner":"...","redFlags":["..."]}
- Actions must be concrete: e.g. listing: "Apply 1 lot, book 50% on listing pop, trail rest with cost stop" / longterm: "Skip now, revisit Q2 post-listing below ₹X if margins hold".`;

export async function groqVerdict(ipoJson: unknown): Promise<VerdictDuo | null> {
  const text = await chat({
    system: SYSTEM,
    user: `Analyze this IPO JSON and return the verdict duo:\n${JSON.stringify(ipoJson).slice(0, 9000)}`,
    maxTokens: 1200,
    json: true,
  });
  if (!text) return null;
  try {
    return JSON.parse(text) as VerdictDuo;
  } catch {
    return null;
  }
}

export async function groqSummarize(prompt: string, context: string): Promise<string | null> {
  return chat({
    system: "You summarize Indian IPO filings in plain language. No investment advice. Cite missing data as unknown. No preamble, no thinking.",
    user: `${prompt}\n\nContext:\n${context.slice(0, 12000)}`,
    maxTokens: 1000,
    temperature: 0.4,
  });
}

/** Deep-dive a long filing excerpt into structured JSON (drives dossier enrichment). */
export async function groqExtractFiling(excerpt: string): Promise<Record<string, unknown> | null> {
  const text = await chat({
    system: `You extract structured facts from Indian IPO offer documents. Return STRICT JSON only: {"financials":[{"fy":"FY24","revenueCr":n,"patCr":n,"roe":n,"roce":n,"de":n,"cfoCr":n}],"peers":[{"name":s,"pe":n,"pb":n,"roe":n}],"risks":[s],"objectsOfIssue":[s],"promoterPre":n,"promoterPost":n,"freshIssuePct":n,"registrar":s,"leadManagers":[s],"about":s}. Use null for anything not found. Numbers only, no commas, no currency symbols.`,
    user: `Extract from this offer-document text:\n${excerpt.slice(0, 14000)}`,
    maxTokens: 2000,
    json: true,
    temperature: 0.1,
  });
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Generic JSON worker with model fallback (powers the social draft engine). */
export async function groqJson(system: string, user: string, maxTokens = 1200): Promise<Record<string, unknown> | null> {
  const text = await chat({ system, user, maxTokens, json: true, temperature: 0.7 });
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}
