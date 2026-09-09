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
  systemCompact?: string;
}): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const debug = process.env.AI_DEBUG === "1";
  // Small free models follow short contracts far better than detailed briefs.
  const system = opts.systemCompact ?? opts.system;
  for (const model of models()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 4000)); // one breather retry on rate limits
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 55000);
        // NOTE: no response_format — it makes small free models ramble into max_tokens
        // (seen: finish_reason=length, empty answer). Instruction + extractJson repair instead.
        // max_tokens 2500: let them think, then pull the {...} block out of the ramble.
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
          max_tokens: Math.max(opts.maxTokens, 2500),
          messages: [
            { role: "system", content: system },
            // Small free models ramble through chain-of-thought and burn max_tokens (seen: finish_reason=length, empty answer).
            { role: "user", content: `${opts.user}\n\nRespond with ONLY the required JSON object. No preamble, no explanation, no thinking trace.` },
          ],
        }),
        signal: ctrl.signal,
      });
        clearTimeout(t);
        if (debug) console.warn(`[openrouter] ${model} -> ${r.status} (attempt)`);
        if (r.status === 404 || r.status === 400 || r.status === 401 || r.status === 403) break; // dead model/key — don't waste the retry
        if (!r.ok) continue; // 429/5xx — retry once, then next model
        // Body reads get their own timeout: stalled streams must not outlive the abort.
        const j = (await Promise.race([
          r.json(),
          new Promise((_, rej) => setTimeout(() => rej(new Error("body-timeout")), 25000)),
        ])) as { choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[]; error?: unknown };
        if (debug) console.warn(`[openrouter] ${model} body:`, JSON.stringify(j).slice(0, 300));
        const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        if (text) return text;
      } catch {
        continue;
      }
    }
  }
  return null;
}
