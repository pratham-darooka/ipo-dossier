"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Flame } from "lucide-react";
import { type IpoSeed, minInvestment, expectedListing } from "@/lib/data";
import { scoreListing, scoreLongTerm } from "@/lib/scoring";

function bar(v: number, max: number) {
  return Math.min(100, (v / max) * 100);
}

export function IpoCard({ ipo, index = 0 }: { ipo: IpoSeed; index?: number }) {
  const f2 = ipo.financials[2];
  const f0 = ipo.financials[0];
  const gro = f2 && f0 && f0.revenueCr ? Math.round(((f2.revenueCr / f0.revenueCr) ** (1 / 2) - 1) * 100) : 0;
  const margin = f2 && f2.revenueCr ? Math.round((f2.patCr / f2.revenueCr) * 100) : 0;
  const cfoPat = f2 && f2.patCr ? f2.cfoCr / f2.patCr : 0;
  const l = scoreListing({ subscriptionTotal: ipo.subscription.total || undefined, qib: ipo.subscription.qib || undefined, gmpPct: ipo.gmp.pct || undefined, anchorPct: ipo.anchorPct || undefined, freshIssuePct: ipo.freshIssuePct || undefined });
  const lt = scoreLongTerm({ revenueGrowth3y: f2 ? gro : undefined, patMargin: f2 ? margin : undefined, cfoVsPat: f2 ? cfoPat : undefined, redFlags: ipo.risks.length || undefined, freshIssuePct: ipo.freshIssuePct || undefined });
  const minInv = minInvestment(ipo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08 }}
      whileHover={{ y: -6, rotateX: 2 }}
      className="card-glow group relative overflow-hidden rounded-3xl border border-white/10 bg-white dark:bg-[#131824] bg-[#FFFFFF] p-6 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono2 text-[11px] tracking-[0.18em] opacity-60">{ipo.sector.toUpperCase()} · {ipo.status.toUpperCase()}</div>
          <Link href={`/ipo/${ipo.slug}`} className="font-display text-2xl font-black leading-tight hover:underline decoration-[#D4FF4F] decoration-2 underline-offset-4">
            {ipo.company}
          </Link>
          <div className="mt-1 font-mono2 text-sm opacity-70">₹{ipo.priceMin}–₹{ipo.priceMax}{ipo.lotSize ? <> · Lot {ipo.lotSize} · <b>₹{minInv.toLocaleString("en-IN")}</b></> : <> · <b>NSE data</b></>}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-mono2 text-xs font-bold ${ipo.gmp.pct > 30 ? "bg-[#D4FF4F] text-black" : ipo.gmp.pct > 10 ? "bg-[#E8C15A] text-black" : "bg-white/10"}`}>
          {ipo.gmp.pct > 0 ? <><Flame className="size-3.5" /> +{ipo.gmp.pct}%</> : "NSE ✓"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 font-mono2 text-xs">
        {( [
          ["QIB", ipo.subscription.qib, 40],
          ["NII", ipo.subscription.nii, 30],
          ["RET", ipo.subscription.retail, 15],
        ] as const).map(([k, v, max]) => (
          <div key={k} className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
            <div className="opacity-60">{k}</div>
            <div className="text-base font-black tnum">{v ? `${v}x` : "—"}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#E8C15A] to-[#D4FF4F]" style={{ width: `${v ? bar(v, max) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-white/15 p-3 font-mono2 text-xs">
        <span className="opacity-60">TOTAL <b className="text-current text-sm">{ipo.subscription.total ? `${ipo.subscription.total}x` : "Not open"}</b></span>
        <span className="opacity-60">EST LIST <b className="text-[#9dff00] dark:text-[#D4FF4F] text-black text-sm">{ipo.gmp.pct > 0 ? `₹${expectedListing(ipo).toLocaleString("en-IN")}` : "—"}</b></span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-full bg-black text-white dark:bg-white dark:text-black px-3 py-1 font-mono2 text-[11px] font-bold">LIST {l.score.toFixed(1)}</span>
        <span className="rounded-full border border-[#E8C15A]/50 px-3 py-1 font-mono2 text-[11px] font-bold">LONG {lt.score.toFixed(1)}</span>
        <Link href={`/ipo/${ipo.slug}`} className="ml-auto inline-flex items-center gap-1 text-sm font-bold hover:gap-2 transition-all">
          Full dossier <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </motion.div>
  );
}
