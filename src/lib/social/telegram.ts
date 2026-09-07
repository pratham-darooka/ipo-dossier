import type { IpoSeed } from "../data";

/**
 * Free distribution: Telegram channel morning brief via Bot API (no cost, no approval).
 * Setup: BotFather -> token (TELEGRAM_BOT_TOKEN), add bot as channel admin,
 * channel id in TELEGRAM_CHAT_ID (e.g. @ipodossier or -100xxxx). Silent no-op until set.
 */

const MAX = 3800;

export function briefText(ipos: IpoSeed[], dateIST: string): string {
  const live = ipos.filter((i) => i.status === "live");
  const upcoming = ipos
    .filter((i) => i.status === "upcoming" && i.openDate)
    .sort((a, b) => +new Date(a.openDate!) - +new Date(b.openDate!))
    .slice(0, 4);
  const fresh = ipos.filter((i) => i.listingPrice != null).slice(0, 3);
  const L: string[] = [`*IPO Dossier — ${dateIST}*`, ``];
  if (live.length) {
    L.push(`*LIVE NOW*`);
    for (const i of live.slice(0, 5)) {
      L.push(`• ${i.company} — ${i.subscription.total || "?"}x (QIB ${i.subscription.qib || "?"}x)${i.gmp.pct > 0 ? ` · GMP +${i.gmp.pct}%` : ""}`);
    }
    L.push(``);
  } else {
    L.push(`No IPO bidding today.`, ``);
  }
  if (upcoming.length) {
    L.push(`*OPENING SOON*`);
    for (const i of upcoming) {
      L.push(`• ${i.company} — ${i.openDate!.slice(5, 10)}${i.priceMax > 0 ? ` · ₹${i.priceMin}-${i.priceMax}` : " · band awaited"}`);
    }
    L.push(``);
  }
  if (fresh.length) {
    L.push(`*FRESH LISTINGS*`);
    for (const i of fresh) {
      L.push(`• ${i.company} — ₹${i.listingPrice} (${(i.listingGainPct ?? 0) > 0 ? "+" : ""}${i.listingGainPct}%)`);
    }
    L.push(``);
  }
  L.push(`Full dossiers: https://ipo-dossier.vercel.app`, `_Educational only — not investment advice_`);
  return L.join("\n").slice(0, MAX);
}

export async function postTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, error: "not-configured" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown", disable_web_page_preview: true }),
    });
    const j = (await r.json()) as { ok?: boolean; description?: string };
    return j.ok ? { ok: true } : { ok: false, error: j.description?.slice(0, 160) ?? "send-failed" };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 120) };
  }
}
