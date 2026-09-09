// Gemini fallback (provider #2). REST, no SDK — one less dependency to break.
// Model: gemini-2.0-flash (fast, cheap, JSON mode). Key: GOOGLE_GENERATIVE_AI_API_KEY.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export function geminiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export async function geminiChat(opts: {
  system: string;
  user: string;
  maxTokens: number;
  json?: boolean;
  temperature?: number;
}): Promise<string | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ parts: [{ text: opts.user }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
