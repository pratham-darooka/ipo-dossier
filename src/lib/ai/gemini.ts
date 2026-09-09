// Gemini fallback (provider #2). REST, no SDK — one less dependency to break.
// Rotation proven 2026-09-09: flash-lite-latest = perfect JSON ~1s;
// 2.5-pro = stronger but 429-prone (chain absorbs it); 2.0-flash/2.5-flash = retired (404).

const MODELS = (process.env.GEMINI_MODELS || "gemini-flash-lite-latest,gemini-2.5-flash-lite,gemini-2.5-pro")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 4000));
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 45000);
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
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
        if (r.status === 404 || r.status === 400) break; // retired model — don't waste the retry
        if (!r.ok) continue; // 429/5xx — retry once, then next model
        const j = (await r.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        };
        const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
        if (text) return text;
      } catch {
        continue;
      }
    }
  }
  return null;
}
