import type { IpoSeed } from "../data";
import type { Evergreen } from "./slides";
import { ipoScores } from "./slides";
import { generatedPosts, type GeneratedPost } from "./generated";
import { ipoCaption, evergreenCaption } from "./captions";

export type QueueItem = {
  date: string; // YYYY-MM-DD (IST)
  slot: string; // display slot
  kind: "ipo" | "generated" | "draft" | "bank";
  ref: string; // slug or evergreen id
  postId: string; // dedupe key in posted-log
  title: string;
  reason: string;
  caption: string;
  slides: number;
  posted: boolean;
  recycled?: boolean;
  carouselBase: string; // URL prefix for slides 1..n
};

const SLOT = "8:00 PM IST";

function istDay(offset: number): string {
  const t = new Date(Date.now() + 5.5 * 3600000 + offset * 86400000);
  return t.toISOString().slice(0, 10);
}

function toEvergreen(g: GeneratedPost): Evergreen {
  return g;
}

/**
 * 14-day queue, 1/day. Priority per day:
 *  1. IPO opening in exactly 2 days (T-2) -> its 5-slide carousel (once per slug)
 *  2. Fresh generated tape posts (demand/countdown/pop/ledger), unposted + unexpired
 *  3. Team drafts (oldest first), unposted
 *  4. Static bank, unposted, alternating beginner/expert
 *  5. Recycle oldest-posted bank item (explicitly labeled — last resort, never silent)
 */
export function buildSchedule(opts: {
  ipos: IpoSeed[];
  bank: Evergreen[];
  drafts: Evergreen[];
  posted: Set<string>;
  days?: number;
}): QueueItem[] {
  const { ipos, bank, drafts, posted } = opts;
  const days = opts.days ?? 14;
  const generated = generatedPosts(ipos);
  const used = new Set<string>();
  const queue: QueueItem[] = [];
  let lastLevel: string | null = null;

  const dayKey = (d: string) => d;
  const upcomingByOpen: Record<string, IpoSeed[]> = {};
  for (const ipo of ipos) {
    if (ipo.status !== "upcoming" || !ipo.openDate) continue;
    const k = dayKey(ipo.openDate.slice(0, 10));
    (upcomingByOpen[k] ??= []).push(ipo);
  }

  const asCaption = (kind: QueueItem["kind"], ref: string): { title: string; caption: string; slides: number; carouselBase: string } => {
    if (kind === "ipo") {
      const ipo = ipos.find((i) => i.slug === ref)!;
      const { l, lt, vl, vlt } = ipoScores(ipo);
      return {
        title: `${ipo.company} IPO — 5-slide dossier`,
        caption: ipoCaption(ipo, l.score, lt.score, vl, vlt),
        slides: 5,
        carouselBase: `/api/carousel/ipo/${ref}`,
      };
    }
    const post: Evergreen | undefined =
      generated.find((g) => g.id === ref) ?? drafts.find((d) => d.id === ref) ?? bank.find((b) => b.id === ref);
    const p = post ?? bank[0];
    return {
      title: p.cover,
      caption: evergreenCaption(p),
      slides: 3,
      carouselBase: `/api/carousel/evergreen/${ref}`,
    };
  };

  for (let d = 0; d < days; d++) {
    const date = istDay(d);
    const t2 = istDay(d + 2);
    let pick: Omit<QueueItem, "date" | "slot" | "posted"> | null = null;

    // 1. T-2 IPO carousels
    for (const ipo of upcomingByOpen[t2] ?? []) {
      const postId = `ipo-${ipo.slug}`;
      if (!posted.has(postId) && !used.has(postId)) {
        const c = asCaption("ipo", ipo.slug);
        pick = { kind: "ipo", ref: ipo.slug, postId, title: c.title, reason: `${ipo.company} opens ${t2} — T-2 anticipation post`, caption: c.caption, slides: c.slides, carouselBase: c.carouselBase };
        break;
      }
    }
    // 2. Generated tape (unexpired, unposted)
    if (!pick) {
      const g = generated.find((x) => {
        if (posted.has(x.id) || used.has(x.id)) return false;
        if (/^\d{4}-\d{2}-\d{2}$/.test(x.validFor) && x.validFor < date) return false;
        return true;
      });
      if (g) {
        const p = toEvergreen(g);
        pick = { kind: "generated", ref: g.id, postId: g.id, title: p.cover, reason: `Fresh from live tape (valid ${g.validFor})`, caption: evergreenCaption(p), slides: 3, carouselBase: `/api/carousel/evergreen/${g.id}` };
      }
    }
    // 3. Team drafts
    if (!pick) {
      const dr = drafts.find((x) => !posted.has(x.id) && !used.has(x.id));
      if (dr) pick = { kind: "draft", ref: dr.id, postId: dr.id, title: dr.cover, reason: "Team draft, awaiting its debut", caption: evergreenCaption(dr), slides: 3, carouselBase: `/api/carousel/evergreen/${dr.id}` };
    }
    // 4. Static bank, alternating levels
    if (!pick) {
      const want: string = lastLevel === "beginner" ? "expert" : "beginner";
      const b: Evergreen | undefined =
        bank.find((x) => x.level === want && !posted.has(x.id) && !used.has(x.id))
        ?? bank.find((x) => !posted.has(x.id) && !used.has(x.id));
      if (b) {
        pick = { kind: "bank", ref: b.id, postId: b.id, title: b.cover, reason: `Evergreen ${b.level} (${b.pillar})`, caption: evergreenCaption(b), slides: 3, carouselBase: `/api/carousel/evergreen/${b.id}` };
        lastLevel = b.level;
      }
    }
    // 5. Recycle oldest (explicit)
    if (!pick && bank.length) {
      const b = bank[0];
      pick = { kind: "bank", ref: b.id, postId: `${b.id}@${date}`, title: b.cover, reason: "Bank exhausted — oldest recycle, refresh the copy", caption: evergreenCaption(b), slides: 3, carouselBase: `/api/carousel/evergreen/${b.id}`, recycled: true };
      lastLevel = b.level;
    }
    if (!pick) continue;
    used.add(pick.postId);
    queue.push({ date, slot: SLOT, posted: posted.has(pick.postId), ...pick });
  }
  return queue;
}

export function captionsMarkdown(queue: QueueItem[]): string {
  const lines = [`# IPO Dossier — posting pack`, ``, `1 post/day · 8:00 PM IST · IPO goes out T-2 before open.`, ``];
  for (const q of queue) {
    lines.push(`---`, ``, `## ${q.date} — ${q.title}`, ``, `Kind: ${q.kind}${q.recycled ? " (RECYCLE — refresh copy)" : ""} · Slides: ${q.slides} · Status: ${q.posted ? "posted ✓" : "todo"}`, ``, `Why: ${q.reason}`, ``, `\`\`\``, q.caption, `\`\`\``, ``);
  }
  return lines.join("\n");
}
