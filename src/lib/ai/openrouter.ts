// OpenRouter fallback (provider #3). FREE models only — never spend a cent.
// Rotation proven 2026-09-09: nex-n2.5-pro + nemotron-3-super = perfect JSON ~1-2s.
// AVOID nemotron-3-ultra (hangs 150s upstream) and inkling (403, harness-only).
// Free-tier models retire often; rotation + env override keeps us alive.

const DEFAULT_FREE = [
  "nex-agi/nex-n2.5-pro:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "poolside/laguna-s-2.1:free",
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
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 4000)); // one breather retry on rate limits
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 45000); // hung upstreams (seen: 150s) must never eat the budget
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
        if (r.status === 404 || r.status === 400 || r.status === 401 || r.status === 403) break; // dead model/key — don't waste the retry
        if (!r.ok) continue; // 429/5xx — retry once, then next model
        const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
        const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        if (text) return text;
      } catch {
        continue;
      }
    }
  }
  return null;
}
