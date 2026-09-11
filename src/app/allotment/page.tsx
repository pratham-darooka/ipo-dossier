import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BellRing, Building2, ExternalLink } from "lucide-react";
import { getAllIpos } from "@/lib/ipos";
import { matchRegistrar, REGISTRARS } from "@/lib/registrars";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, faqJsonLd } from "@/lib/seo";
import { fmtDate } from "@/lib/utils";
import type { IpoSeed } from "@/lib/data";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "IPO allotment status: check any mainboard IPO",
  description:
    "Check IPO allotment status the right way: the exact registrar link per IPO, what to keep ready (PAN, application number, DP ID), and when results actually go live.",
  alternates: { canonical: `${SITE_URL}/allotment` },
  openGraph: {
    title: "IPO allotment status: check any mainboard IPO",
    description: "The exact registrar link per IPO, timing, and what to keep ready. No PAN entered here — checks happen on official portals.",
    url: `${SITE_URL}/allotment`,
    type: "website",
    siteName: "IPO Dossier",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

const FAQS: [string, string][] = [
  [
    "How do I check my IPO allotment status?",
    "Open the registrar link for your IPO (MUFG Intime, KFintech, or Bigshare), select the company, enter your PAN, application number, or DP/Client ID, solve the captcha, and submit. Results go live on the registrar first — usually 6–10 PM on allotment evening.",
  ],
  [
    "When is IPO allotment declared?",
    "The basis of allotment is typically finalised the evening of the first working day after the issue closes. There is nothing to check before then — an early 'not allotted' just means results aren't published yet.",
  ],
  [
    "What details do I need to check allotment?",
    "Any one of: PAN number (fastest), application number (in your UPI/ASBA confirmation SMS), or DP/Client ID (in your demat account). Screenshot your application confirmation the day you apply.",
  ],
  [
    "Why can't I check allotment directly on this site?",
    "Registrars protect allotment data with captchas and treat your PAN/application number as login credentials. No legitimate site can show your personal result without sending you to the official portal — any site claiming otherwise is harvesting your data.",
  ],
  [
    "The registrar site is slow or down. What now?",
    "Try Bigshare's Server 2/3 instead of Server 1 during the 6–8 PM rush, wait till after 9 PM when crowds thin, or check again in the morning — allotment data doesn't move once published.",
  ],
];

/** Days since close, negative = still open. */
function daysSinceClose(ipo: IpoSeed, now: number): number | null {
  if (!ipo.closeDate) return null;
  return Math.floor((now - new Date(ipo.closeDate).getTime()) / 86400000);
}

export default async function AllotmentPage() {
  const all = await getAllIpos();
  // Time-dependent server render is intentional: the allotment window is relative to now,
  // and ISR revalidation re-snapshots it. See react-hooks/purity exemption below.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  // Check-now window: closed within the last 6 days (basis + early listing), plus live closers within 2 days.
  const checkNow = all
    .filter((i) => {
      const d = daysSinceClose(i, now);
      if (d == null) return false;
      if (i.status === "live" && d >= -2) return true;
      if (d >= 0 && d <= 6 && i.status !== "upcoming") return true;
      return false;
    })
    .sort((a, b) => +new Date(b.closeDate || 0) - +new Date(a.closeDate || 0));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12">
      <JsonLd data={faqJsonLd(FAQS)} />
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">ALLOTMENT DESK · RIGHT LINK · RIGHT TIME</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Did you get the allotment?</h1>
        <p className="mt-4 max-w-2xl text-lg opacity-70">
          Pick your IPO below and go <b>straight to its registrar</b> — that{"'"}s where results land first, usually{" "}
          <b>6–10 PM on allotment evening</b>. You never type your PAN here; every check happens on the official portal.
        </p>
      </Reveal>

      {/* CHECK NOW */}
      <section className="mt-10">
        <h2 className="font-display text-3xl font-black flex items-center gap-2">
          <BellRing className="size-6 text-[#D4FF4F]" /> Check now ({checkNow.length})
        </h2>
        {checkNow.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {checkNow.map((ipo, idx) => {
              const reg = matchRegistrar(ipo.registrar);
              const d = daysSinceClose(ipo, now) ?? 0;
              const state = d < 0 ? `Bidding closes ${fmtDate(ipo.closeDate)} — basis next` : d === 0 ? "Closed today — basis lands this evening" : `Closed ${fmtDate(ipo.closeDate)} — results should be live`;
              return (
                <Reveal key={ipo.slug} delay={(idx % 2) * 0.08}>
                  <div className="rounded-[2rem] border border-white/10 bg-white dark:bg-[#131824] p-6 card-glow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/ipo/${ipo.slug}`} className="font-display text-2xl font-black hover:underline decoration-[#D4FF4F] decoration-2 underline-offset-4">
                          {ipo.company}
                        </Link>
                        <div className="mt-1 font-mono2 text-xs opacity-60">{state}</div>
                      </div>
                      <span className="font-mono2 text-[11px] rounded-full bg-white/10 px-2.5 py-1 whitespace-nowrap">{ipo.status.toUpperCase()}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {reg ? (
                        <a href={reg.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#D4FF4F] px-5 py-2.5 text-sm font-bold text-black hover:brightness-110">
                          Check on {reg.name} <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        <Link href={`/ipo/${ipo.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#D4FF4F] px-5 py-2.5 text-sm font-bold text-black hover:brightness-110">
                          Open dossier <ArrowUpRight className="size-4" />
                        </Link>
                      )}
                      <Link href={`/ipo/${ipo.slug}`} className="inline-flex items-center gap-1 text-sm font-bold ml-auto">
                        Dossier <ArrowUpRight className="size-4" />
                      </Link>
                    </div>
                    <div className="mt-3 font-mono2 text-[11px] opacity-60">
                      REGISTRAR: {ipo.registrar || "confirming"} · KEEP READY: PAN / application no. / DP ID
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 opacity-60">No IPO in the allotment window right now — check back after the next close.</p>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-14">
        <h2 className="font-display text-3xl font-black">How allotment day actually works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            ["T+1 evening", "Basis finalised", "Registrar computes lottery/pro-rata. Nothing exists to check before this."],
            ["6–10 PM", "Registrar goes live", "MUFG/KFin/Bigshare publish first. This is your window — expect crowds."],
            ["Late night", "Registrar mirrors", "Results stay live on the registrar through listing — recheck anytime, crowds gone."],
            ["Pre-listing", "Demat credit", "Allotted shares appear in holdings a day before listing. Refunds unblock alongside."],
          ].map(([t, h, d]) => (
            <div key={h} className="rounded-3xl border border-white/10 p-5">
              <div className="font-mono2 text-xs tracking-[0.18em] text-[#9db82a] dark:text-[#D4FF4F]">{t}</div>
              <div className="mt-1 font-bold">{h}</div>
              <p className="mt-1 text-sm opacity-70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DIRECTORY */}
      <section className="mt-14">
        <h2 className="font-display text-3xl font-black flex items-center gap-2"><Building2 className="size-6" /> Registrar directory</h2>
        <p className="mt-2 opacity-60 text-sm">Know your registrar already? Go straight there. Nearly every mainboard IPO runs through the first two.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {REGISTRARS.map((r) => (
            <div key={r.key} className="rounded-3xl border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-lg">{r.name} {r.aka ? <span className="font-mono2 text-xs opacity-50">({r.aka})</span> : null}</div>
                <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/20 px-4 py-2 text-sm font-bold hover:bg-white/5 whitespace-nowrap">
                  Open <ExternalLink className="size-3.5" />
                </a>
              </div>
              <div className="mt-2 font-mono2 text-xs opacity-60">ACCEPTS: {r.accepts.join(" · ")}</div>
              <p className="mt-2 text-sm opacity-70">{r.tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14 rounded-[2rem] border border-white/10 p-6 md:p-8">
        <h2 className="font-display text-3xl font-black">Allotment questions, answered</h2>
        <div className="mt-4 space-y-4">
          {FAQS.map(([q, a]) => (
            <div key={q}>
              <h3 className="font-bold">{q}</h3>
              <p className="mt-1 text-sm opacity-70">{a}</p>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-6 font-mono2 text-[11px] opacity-50">Educational only. Allotment checks happen on official registrar/exchange portals — never enter PAN details on any third-party site.</p>
    </div>
  );
}
