"use client";

import { useState } from "react";
import { ScoreDial } from "./score-dial";
import { BrainCircuit, Loader2, Sparkles } from "lucide-react";

type Duo = {
  listing: { score: number; verdict: string; reasons: string[]; action: string };
  longterm: { score: number; verdict: string; reasons: string[]; action: string };
  oneLiner: string;
  redFlags: string[];
};

export function VerdictDuo({ slug, fallback }: { slug: string; fallback: Duo }) {
  const [data, setData] = useState<Duo>(fallback);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);

  async function askGroq() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const j = await r.json();
      if (j?.ok && j?.verdict) {
        setData(j.verdict);
        setAi(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Manual trigger only — deterministic scores render instantly, Groq runs on demand to save calls.

  const pill = (v: string) =>
    v === "APPLY" ? "bg-[#D4FF4F] text-black" : v === "AVOID" ? "bg-[#FF5C5C] text-black" : "bg-[#E8C15A] text-black";

  return (
    <div>
      <div className="flex items-center gap-2 font-mono2 text-[11px] tracking-[0.2em] opacity-60">
        <BrainCircuit className="size-4" />
        {ai ? "GROQ AI · GROUNDED ON FILING" : loading ? "ASKING GROQ…" : "DETERMINISTIC SCORE · TAP RE-RUN FOR AI NARRATIVE"}
        <button onClick={askGroq} className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 hover:bg-white/5">
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Re-run AI
        </button>
      </div>
      <p className="font-display mt-3 text-2xl md:text-3xl font-black leading-tight">“{data.oneLiner}”</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[#D4FF4F]/30 bg-gradient-to-b from-[#D4FF4F]/10 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="font-mono2 text-xs tracking-[0.2em] opacity-70">⚡ LISTING-GAIN TRADER · 10 DAYS</div>
            <span className={`rounded-full px-3 py-1 font-mono2 text-xs font-black ${pill(data.listing.verdict)}`}>{data.listing.verdict}</span>
          </div>
          <div className="mt-4"><ScoreDial score={data.listing.score} label="LISTING SCORE" tone="gain" /></div>
          <ul className="mt-4 space-y-2 text-sm">
            {data.listing.reasons.map((r, i) => <li key={i} className="flex gap-2"><span className="text-[#D4FF4F]">▸</span>{r}</li>)}
          </ul>
          <div className="mt-4 rounded-2xl bg-black/40 dark:bg-black/60 bg-black/5 p-3 text-sm"><b>Action → </b>{data.listing.action}</div>
        </div>

        <div className="rounded-3xl border border-[#E8C15A]/30 bg-gradient-to-b from-[#E8C15A]/10 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="font-mono2 text-xs tracking-[0.2em] opacity-70">◆ LONG-TERM INVESTOR · 3 YEARS</div>
            <span className={`rounded-full px-3 py-1 font-mono2 text-xs font-black ${pill(data.longterm.verdict)}`}>{data.longterm.verdict}</span>
          </div>
          <div className="mt-4"><ScoreDial score={data.longterm.score} label="COMPOUNDER SCORE" tone="gold" /></div>
          <ul className="mt-4 space-y-2 text-sm">
            {data.longterm.reasons.map((r, i) => <li key={i} className="flex gap-2"><span className="text-[#E8C15A]">▸</span>{r}</li>)}
          </ul>
          <div className="mt-4 rounded-2xl bg-black/40 dark:bg-black/60 bg-black/5 p-3 text-sm"><b>Action → </b>{data.longterm.action}</div>
        </div>
      </div>

      {data.redFlags.length > 0 && (
        <div className="mt-4 rounded-3xl border border-[#FF5C5C]/30 p-6">
          <div className="font-mono2 text-xs tracking-[0.2em] text-[#FF5C5C]">DRHP FOOTNOTE RED FLAGS — READ BEFORE APPLYING</div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
            {data.redFlags.map((r, i) => <li key={i} className="rounded-2xl bg-[#FF5C5C]/10 p-3">⚠ {r}</li>)}
          </ul>
        </div>
      )}
      <p className="mt-3 font-mono2 text-[11px] opacity-50">Educational only. Not investment advice. GMP is unofficial chatter, never a promise.</p>
    </div>
  );
}
