import Link from "next/link";
import type { Metadata } from "next";
import { getPipelineStatus } from "@/lib/pipeline";
import { Reveal } from "@/components/reveal";
import { SITE_URL } from "@/lib/seo";
import { Check, CircleDashed, Activity } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pipeline status: is every dossier building?",
  description: "Live view of IPO Dossier's data pipeline: last sync runs and per-IPO dossier completeness.",
  alternates: { canonical: `${SITE_URL}/status` },
  robots: { index: false, follow: false },
};

function ago(iso: string | null) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function StatusPage() {
  const s = await getPipelineStatus();
  const sync = s.sync as Record<string, number | string> | null;
  const gmp = s.gmp as Record<string, number | string> | null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60 inline-flex items-center gap-2">
          <Activity className="size-4" /> PIPELINE TRANSPARENCY · SAME DATA WE USE
        </div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Is every dossier building?</h1>
        <p className="mt-4 max-w-2xl opacity-70">
          {s.counts.total ? <><b>{s.counts.complete}/{s.counts.total}</b> dossiers complete, <b>{s.counts.building}</b> still building. </> : "Pipeline status unavailable. "}
          This page reads the same Neon rows the site renders — no separate story.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 p-6">
          <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">POST-OPEN PIPELINE · 9:45 IST DAILY</div>
          <div className="mt-2 font-bold text-lg">Last run {ago(s.syncAt)}</div>
          {sync ? (
            <div className="mt-2 font-mono2 text-xs opacity-70 space-y-1">
              <div>NSE rows seen: <b>{String(sync.nse ?? "—")}</b> · live: <b>{String(sync.live ?? "—")}</b></div>
              <div>updated <b>{String(sync.updated ?? 0)}</b> · inserted <b>{String(sync.inserted ?? 0)}</b> · new forthcoming <b>{String(sync.forthcomingNew ?? 0)}</b> · transitioned <b>{String(sync.transitioned ?? 0)}</b></div>
              <div>docs parsed <b>{String(sync.docsParsed ?? 0)}</b> · listings fixed <b>{String(sync.listingsFixed ?? 0)}</b> · news cached <b>{String(sync.newsCached ?? 0)}</b>{sync.timedOut ? " · hit time budget" : ""}</div>
            </div>
          ) : <p className="mt-2 text-sm opacity-60">No run recorded yet.</p>}
        </div>
        <div className="rounded-3xl border border-white/10 p-6">
          <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">PRE-OPEN GMP · 9:00 IST DAILY</div>
          <div className="mt-2 font-bold text-lg">Last run {ago(s.gmpAt)}</div>
          {gmp ? (
            <div className="mt-2 font-mono2 text-xs opacity-70 space-y-1">
              <div>checked <b>{String(gmp.checked ?? 0)}</b> · refreshed <b>{String(gmp.refreshed ?? 0)}</b> · stale <b>{String(gmp.stale ?? 0)}</b></div>
            </div>
          ) : <p className="mt-2 text-sm opacity-60">No run recorded yet.</p>}
        </div>
      </div>

      <h2 className="font-display mt-10 text-3xl font-black">Per-IPO progress</h2>
      <div className="mt-4 space-y-3">
        {s.rows.map((r) => (
          <div key={r.slug} className="rounded-3xl border border-white/10 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/ipo/${r.slug}`} className="font-bold text-lg hover:underline decoration-[#D4FF4F] underline-offset-4">{r.company}</Link>
              <span className="font-mono2 text-[11px] rounded-full bg-white/10 px-2.5 py-1">{r.status.toUpperCase()}</span>
              <span className="ml-auto font-mono2 text-sm font-black tnum">{r.pct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#E8C15A] to-[#D4FF4F]" style={{ width: `${r.pct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {r.checks.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1 opacity-80" title={c.detail}>
                  {c.state === "done" ? <Check className="size-3.5 text-[#9db82a] dark:text-[#D4FF4F]" /> : c.state === "na" ? <span className="font-mono2 text-[10px] opacity-40">N/A</span> : <CircleDashed className="size-3.5 opacity-40" />}
                  {c.label}
                </span>
              ))}
            </div>
            <div className="mt-2 font-mono2 text-[11px] opacity-50">NEXT: {r.nextStep}{r.syncedAt ? ` · synced ${ago(r.syncedAt)}` : ""}</div>
          </div>
        ))}
        {!s.rows.length && <p className="opacity-60">No rows yet.</p>}
      </div>
    </div>
  );
}
