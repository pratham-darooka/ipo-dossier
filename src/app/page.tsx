import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, BadgeCheck, Scale, Telescope } from "lucide-react";
import { getAllIpos } from "@/lib/ipos";
import { IpoCard } from "@/components/ipo-card";
import { Reveal } from "@/components/reveal";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Live mainboard IPOs: GMP, subscription, verdicts",
  description: "Track every live and upcoming mainboard IPO in India: NSE subscription multiples, GMP sentiment, DRHP forensics and apply-or-avoid verdicts.",
  alternates: { canonical: SITE_URL },
};

export default async function Home() {
  const IPOS = await getAllIpos();
  const live = IPOS.filter((i) => i.status === "live");
  const upcoming = IPOS.filter((i) => i.status === "upcoming");
  const listed = IPOS.filter((i) => i.status === "listed");

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#D4FF4F]/15 blur-[140px]" />
          <div className="absolute top-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#E8C15A]/10 blur-[120px]" />
          <div className="absolute top-20 -right-40 h-[420px] w-[420px] rounded-full bg-[#FF5C5C]/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-10 md:pt-24">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 font-mono2 text-xs">
              <span className="size-2 rounded-full bg-[#D4FF4F] animate-pulse-dot" />
              LIVE · {live.length} OPEN · {upcoming.length} UPCOMING · MAINBOARD ONLY
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-display mt-6 text-[13vw] sm:text-7xl md:text-8xl font-black leading-[0.95] tracking-tight">
              Apply<span className="text-[#9db82a] dark:text-[#D4FF4F]">.</span> Avoid<span className="text-[#FF5C5C]">.</span>
              <br />
              <span className="italic font-light">Know why.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg opacity-70">
              Every IPO has a file. Read it before you bid — live subscription, GMP sentiment, DRHP forensics,
              valuation vs peers, and <b>two separate verdicts</b>: one for the listing-gain trader, one for the long-term compounder hunter.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#live" className="rounded-full bg-[#D4FF4F] px-7 py-3.5 font-bold text-black hover:brightness-110 inline-flex items-center gap-2">
                Explore live IPOs <ArrowDown className="size-4" />
              </a>
              <Link href="/compare" className="rounded-full border border-white/20 px-7 py-3.5 font-bold hover:bg-white/5 inline-flex items-center gap-2">
                <Scale className="size-4" /> Compare IPOs
              </Link>
              <Link href="/performance" className="rounded-full border border-white/20 px-7 py-3.5 font-bold hover:bg-white/5 inline-flex items-center gap-2">
                <Telescope className="size-4" /> Does GMP lie?
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 grid grid-cols-3 max-w-xl gap-3 font-mono2 text-center">
              {[["47", "mainboard listed '26"], ["+10.6%", "avg listing gain"], ["70%", "GMP direction hit-rate"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/10 p-4">
                  <div className="text-2xl font-black tnum">{v}</div>
                  <div className="text-[11px] opacity-60">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* LIVE */}
      <section id="live" className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <Reveal>
          <div className="flex items-end justify-between">
            <h2 className="font-display text-4xl md:text-5xl font-black">🔴 Live now <span className="font-mono2 text-sm align-middle opacity-50">/ {live.length} open for bidding</span></h2>
            <Link href="/calendar" className="hidden sm:inline-flex items-center gap-1 text-sm font-bold">Full calendar <ArrowUpRight className="size-4" /></Link>
          </div>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {live.map((ipo, i) => <IpoCard key={ipo.slug} ipo={ipo} index={i} />)}
        </div>
      </section>

      {/* UPCOMING */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <Reveal>
          <h2 className="font-display text-4xl md:text-5xl font-black">⏳ Opening soon</h2>
          <p className="mt-2 opacity-60">Price band is out. Study the dossier before Day 1 — QIB Day-1 tells you everything.</p>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((ipo, i) => <IpoCard key={ipo.slug} ipo={ipo} index={i} />)}
        </div>
      </section>

      {/* LISTED + GMP TRUTH TEASER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <Reveal>
          <h2 className="font-display text-4xl md:text-5xl font-black">✅ Recently listed — did GMP lie?</h2>
        </Reveal>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {listed.map((ipo) => (
            <div key={ipo.slug} className="rounded-3xl border border-white/10 p-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-bold text-lg"><BadgeCheck className="inline size-4 mr-1 text-[#D4FF4F]" />{ipo.company}</div>
                <div className="font-mono2 text-xs opacity-60 mt-1">GMP was +{ipo.gmp.pct}% · SUB {ipo.subscription.total}x · QIB {ipo.subscription.qib}x</div>
              </div>
              <Link href={`/ipo/${ipo.slug}`} className="rounded-full bg-white text-black dark:bg-white px-4 py-2 text-sm font-bold">Autopsy →</Link>
            </div>
          ))}
          <Link href="/performance" className="rounded-3xl border border-dashed border-[#D4FF4F]/40 p-6 grid place-items-center text-center hover:bg-[#D4FF4F]/5">
            <div>
              <div className="font-display text-2xl font-black">Skyways listed −10% with +23% GMP.</div>
              <div className="mt-1 text-sm opacity-60">See the full GMP-vs-actual ledger →</div>
            </div>
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-16">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white dark:from-white/5 to-transparent p-8 md:p-12 grid gap-8 md:grid-cols-4">
          {[
            ["01 · Track", "NSE/BSE + SEBI pipeline scraped every 30 min. Dates, band, lot — never miss a window."],
            ["02 · Forensics", "Groq reads the DRHP footnotes: cash vs profit, RPTs, contingent liabilities, promoter repricing."],
            ["03 · Two verdicts", "Listing trader gets momentum score. Long-term investor gets compounder score. Never mixed."],
            ["04 · Act", "Listing-day playbook: what to do pre-open, when to book, when to hold. Allotment links included."],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="font-mono2 text-xs tracking-[0.2em] text-[#9db82a] dark:text-[#D4FF4F]">{t}</div>
              <p className="mt-2 text-sm opacity-70">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
