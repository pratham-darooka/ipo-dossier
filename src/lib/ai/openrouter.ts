// OpenRouter fallback (provider #3). FREE models only — never spend a cent.
// Models: OPENROUTER_MODELS (comma-separated) or built-in free-tier rotation.
// Key: OPENROUTER_API_KEY. Free-tier models retire often; rotation + env override keeps us alive.

const DEFAULT_FREE = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemma-3-27b-it:free",
];

function models(): string[] {
  const env = (process.env.OPENROUTER_MODELS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return env.length ? env : DEFAULT_FREE;
}

export function openrouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function openrouterChat(opts: {
  system: string;
  user: string;
  maxTokens: number;
  json?: boolean;
  temperature?: number;
}): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of models()) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://ipo-dossier.vercel.app",
          "X-Title": "IPO Dossier",
        },
        body: JSON.stringify({
          model,
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxTokens,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!r.ok) continue;
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (text) return text;
    } catch {
      continue;
    }
  }
  return null;
}
