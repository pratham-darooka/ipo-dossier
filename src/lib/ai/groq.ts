import Groq from "groq-sdk";

const MODEL = "openai/gpt-oss-120b";

function client() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
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
- Return STRICT JSON only, no markdown: {"listing":{"score":n,"verdict":"...","reasons":["...","...","..."],"action":"..."},"longterm":{"score":n,"verdict":"...","reasons":["...","...","..."],"action":"..."},"oneLiner":"...","redFlags":["..."]}
- Actions must be concrete: e.g. listing: "Apply 1 lot, book 50% on listing pop, trail rest with cost stop" / longterm: "Skip now, revisit Q2 post-listing below ₹X if margins hold".`;

export async function groqVerdict(ipoJson: unknown): Promise<VerdictDuo | null> {
  const c = client();
  if (!c) return null;
  try {
    const res = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Analyze this IPO JSON and return the verdict duo:\n${JSON.stringify(ipoJson).slice(0, 9000)}` },
      ],
      response_format: { type: "json_object" },
    });
    const text = res.choices?.[0]?.message?.content ?? "";
    return JSON.parse(text) as VerdictDuo;
  } catch {
    return null;
  }
}

export async function groqSummarize(prompt: string, context: string): Promise<string | null> {
  const c = client();
  if (!c) return null;
  try {
    const res = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 800,
      messages: [
        { role: "system", content: "You summarize Indian IPO filings in plain language. No investment advice. Cite missing data as unknown." },
        { role: "user", content: `${prompt}\n\nContext:\n${context.slice(0, 8000)}` },
      ],
    });
    return res.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}
