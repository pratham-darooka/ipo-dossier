import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Building2, Users, AlertTriangle, FileText, ExternalLink, Satellite } from "lucide-react";
import { IPOS, minInvestment, expectedListing, type IpoSeed } from "@/lib/data";
import { findIpo, getAllIpos } from "@/lib/ipos";
import { scoreListing, scoreLongTerm, verdict } from "@/lib/scoring";
import { ipoFaqs, ipoJsonLd, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { VerdictDuo } from "@/components/verdict-duo";
import { Reveal } from "@/components/reveal";
import { fmtDate } from "@/lib/utils";

export function generateStaticParams() {
  return IPOS.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ipo = await findIpo(slug);
  if (!ipo) return { title: "IPO not found — IPO Dossier" };
  const verdictBit = ipo.listingPrice != null
    ? `listed at ₹${ipo.listingPrice} (${ipo.listingGainPct}%)`
    : ipo.status === "live" ? `live now, ${ipo.subscription.total || "—"}x subscribed` : `opens ${fmtDate(ipo.openDate)}`;
  const title = `${ipo.company} IPO: dates, GMP, review — apply or avoid?`;
  const description = `${ipo.company} IPO price band ₹${ipo.priceMin}–₹${ipo.priceMax}, ${verdictBit}. Live NSE demand, DRHP forensics and separate verdicts for listing traders and long-term investors.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/ipo/${ipo.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/ipo/${ipo.slug}`, type: "article", siteName: "IPO Dossier", images: [`${SITE_URL}/api/og/${ipo.slug}`] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/api/og/${ipo.slug}`] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

function band(ipo: IpoSeed) {
  if (ipo.priceMax) return `₹${ipo.priceMin}–₹${ipo.priceMax}`;
  return "Awaited";
}

export default async function IpoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ipo = await findIpo(slug);
  if (!ipo) notFound();

  const f = ipo.financials;
  const hasFin = f.length >= 3;
  const growth = hasFin ? Math.round(((f[2].revenueCr / f[0].revenueCr) ** 0.5 - 1) * 100) : 0;
  const margin = hasFin && f[2].revenueCr ? Math.round((f[2].patCr / f[2].revenueCr) * 100) : 0;
  const l = scoreListing({ subscriptionTotal: ipo.subscription.total || undefined, qib: ipo.subscription.qib || undefined, gmpPct: ipo.gmp.pct || undefined, anchorPct: ipo.anchorPct || undefined, freshIssuePct: ipo.freshIssuePct || undefined });
  const lt = scoreLongTerm({ revenueGrowth3y: hasFin ? growth : undefined, patMargin: hasFin ? margin : undefined, cfoVsPat: hasFin && f[2].patCr ? f[2].cfoCr / f[2].patCr : undefined, redFlags: ipo.risks.length || undefined, freshIssuePct: ipo.freshIssuePct || undefined });

  const fallback = {
    listing: { score: l.score, verdict: verdict(l.score), reasons: l.reasons.length ? l.reasons : ["NSE demand data only so far — watch Day-1 QIB"], action: l.score >= 7 ? "Apply 1 lot; book 50% on listing pop, trail rest at cost." : l.score >= 5 ? "Apply only if QIB crosses 5x by Day 2, else skip." : "Skip for listing — weak demand setup." },
    longterm: { score: lt.score, verdict: hasFin ? verdict(lt.score) : "NEUTRAL", reasons: lt.reasons.length ? lt.reasons : ["Filing data not yet parsed — long-term call awaits DRHP"], action: hasFin ? (lt.score >= 7 ? "Apply + hold 2-3 quarters; add on dips if margins hold." : lt.score >= 5 ? "Wait for 1-2 listed quarters before entering." : "Avoid for portfolio — better compounders listed already.") : "Wait for the full dossier (financials + peers) before sizing a long-term bet." },
    oneLiner: hasFin
      ? `${ipo.company}: ${l.score >= lt.score ? "momentum beats fundamentals — a trader's IPO, not an investor's." : "fundamentals beat hype — an investor's IPO, be calm on listing."}`
      : `${ipo.company}: fresh on NSE — demand tape is live, full dossier building.`,
    redFlags: ipo.risks,
  };

  const maxSub = Math.max(ipo.subscription.qib, ipo.subscription.nii, ipo.subscription.retail, 1);
  const faqs = ipoFaqs(ipo, l.score, lt.score, growth, margin, hasFin);
  void getAllIpos;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
      <JsonLd data={ipoJsonLd(ipo, faqs)} />
      <Link href="/" className="inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"><ArrowLeft className="size-4" /> All IPOs</Link>

      {/* HERO */}
      <div className="mt-4 overflow-hidden rounded-[2rem] border border-white/10">
        <div className="bg-gradient-to-br from-[#D4FF4F]/15 via-transparent to-[#E8C15A]/10 p-8 md:p-12">
          <Reveal>
            <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">{ipo.sector.toUpperCase()} · {ipo.status.toUpperCase()} · NSE BSE MAINBOARD</div>
            <h1 className="font-display mt-3 text-5xl md:text-7xl font-black tracking-tight">{ipo.company}</h1>
            {ipo.about ? <p className="mt-4 max-w-2xl opacity-70">{ipo.about}</p> : (
              <p className="mt-4 max-w-2xl opacity-70 inline-flex items-center gap-2"><Satellite className="size-4" /> Spotted on NSE{"'"}s official IPO board. Demand tape is live below — full filing dossier (financials, peers, risks) builds automatically.</p>
            )}
          </Reveal>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 font-mono2">
            {[
              ["PRICE BAND", band(ipo)],
              ["LOT / MIN", ipo.lotSize ? `${ipo.lotSize} sh · ₹${minInvestment(ipo).toLocaleString("en-IN")}` : "Lot awaited"],
              ["ISSUE SIZE", ipo.issueSizeCr ? `₹${ipo.issueSizeCr} Cr · ${ipo.freshIssuePct}% fresh` : "NSE official"],
              ["GMP (UNOFFICIAL)", ipo.gmp.pct > 0 ? `₹${ipo.gmp.value} (+${ipo.gmp.pct}%)` : "No quote yet"],
              ["EST LISTING", ipo.gmp.pct > 0 ? `₹${expectedListing(ipo).toLocaleString("en-IN")}` : band(ipo)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-black/40 dark:bg-black/50 bg-white/60 p-4 border border-white/10">
                <div className="text-[10px] tracking-[0.18em] opacity-60">{k}</div>
                <div className="mt-1 font-black text-sm md:text-base tnum">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 font-mono2 text-xs">
            {[["Open", ipo.openDate], ["Close", ipo.closeDate], ["Allotment", ipo.allotmentDate], ["Listing", ipo.listingDate]].map(([k, v]) => (
              v ? <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><CalendarDays className="size-3" />{k}: {fmtDate(v)}</span> : null
            ))}
            {ipo.syncedAt ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D4FF4F]/15 px-3 py-1.5 text-[#9db82a] dark:text-[#D4FF4F]">● NSE synced {new Date(ipo.syncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span> : null}
          </div>
        </div>
      </div>

      {/* LISTING OUTCOME (past IPOs — the receipt) */}
      {ipo.listingPrice != null && (
        <section className="mt-6 rounded-[2rem] border border-white/10 p-6 md:p-8 flex flex-wrap items-center gap-4">
          <div>
            <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">LISTED {ipo.listingDate ? fmtDate(ipo.listingDate) : ""} · NSE</div>
            <div className="font-display text-3xl md:text-4xl font-black mt-1">
              Listed @ ₹{ipo.listingPrice}{" "}
              <span className={(ipo.listingGainPct ?? 0) >= 0 ? "text-[#9db82a] dark:text-[#D4FF4F]" : "text-[#FF5C5C]"}>
                ({(ipo.listingGainPct ?? 0) > 0 ? "+" : ""}{ipo.listingGainPct}%)
              </span>
            </div>
          </div>
          <Link href="/performance" className="ml-auto rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold hover:bg-white/5">Full GMP-vs-actual ledger →</Link>
        </section>
      )}

      {/* VERDICT DUO */}
      <section className="mt-8 rounded-[2rem] border border-white/10 p-6 md:p-10">
        <VerdictDuo slug={ipo.slug} fallback={fallback} />
      </section>

      {/* DEMAND */}
      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Reveal className="rounded-[2rem] border border-white/10 p-6 md:p-8">
          <h3 className="font-display text-2xl font-black">Demand — who is actually bidding?</h3>
          <p className="text-sm opacity-60 mt-1">Live from NSE{"'"}s official bid feed. QIB is smart money — if QIB sleeps past Day 2, listing pop usually dies.</p>
          <div className="mt-5 space-y-3">
            {([["QIB (institutions)", ipo.subscription.qib], ["NII (HNI)", ipo.subscription.nii], ["Retail (you)", ipo.subscription.retail], ["Total", ipo.subscription.total]] as const).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between font-mono2 text-sm"><span>{k}</span><b className="tnum">{v ? `${v}x` : "—"}</b></div>
                <div className="mt-1 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#E8C15A] to-[#D4FF4F]" style={{ width: `${v ? Math.min(100, (v / maxSub) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-black/5 dark:bg-white/5 p-4 text-sm">
            <b>Anchor:</b> {ipo.anchorPct ? `${ipo.anchorPct}% of issue pre-placed` : "—"} · <b>Registrar:</b> {ipo.registrar || "—"} · <b>Bankers:</b> {ipo.leadManagers.length ? ipo.leadManagers.join(", ") : "—"}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="rounded-[2rem] border border-white/10 p-6 md:p-8">
          <h3 className="font-display text-2xl font-black">Issue structure — where does money go?</h3>
          {ipo.freshIssuePct > 0 ? (
            <>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative size-32 rounded-full" style={{ background: `conic-gradient(#D4FF4F ${ipo.freshIssuePct}%, #FF5C5C 0)` }}>
                  <div className="absolute inset-4 rounded-full bg-[#10141C] dark:bg-[#10141C] bg-[#FAF7F0] grid place-items-center font-mono2 text-sm font-black">{ipo.freshIssuePct}% fresh</div>
                </div>
                <ul className="text-sm space-y-2">
                  {ipo.objectsOfIssue.map((o) => <li key={o} className="flex gap-2"><span className="text-[#D4FF4F]">▸</span>{o}</li>)}
                  {ipo.promoterPre ? <li className="opacity-60">Promoter {ipo.promoterPre}% → {ipo.promoterPost}% after IPO</li> : null}
                </ul>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-4 text-sm opacity-80">
                {ipo.freshIssuePct > 60 ? "✓ Mostly fresh capital — funds real growth." : ipo.freshIssuePct > 35 ? "◐ Half OFS — check if valuation justifies promoter exit." : "⚠ Mostly OFS — you are buying the promoter out, not the future."}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm opacity-60">Fresh-vs-OFS split lands here once the RHP is parsed. For now, the demand tape on the left is your edge.</p>
          )}
        </Reveal>
      </section>

      {/* FINANCIALS */}
      {hasFin ? (
        <section className="mt-6 rounded-[2rem] border border-white/10 p-6 md:p-8 overflow-x-auto">
          <h3 className="font-display text-2xl font-black">Deep financials — does profit become cash?</h3>
          <table className="mt-4 w-full font-mono2 text-sm min-w-[640px]">
            <thead><tr className="opacity-50 text-xs">{["FY", "REVENUE", "PAT", "MARGIN", "ROE", "ROCE", "D/E", "CFO"].map((h) => <th key={h} className="text-left py-2 pr-4">{h}</th>)}</tr></thead>
            <tbody>
              {f.map((row) => (
                <tr key={row.fy} className="border-t border-white/10">
                  <td className="py-3 pr-4 font-bold">{row.fy}</td>
                  <td className="pr-4 tnum">₹{row.revenueCr} Cr</td>
                  <td className="pr-4 tnum">₹{row.patCr} Cr</td>
                  <td className="pr-4 tnum">{((row.patCr / row.revenueCr) * 100).toFixed(1)}%</td>
                  <td className="pr-4 tnum">{row.roe}%</td>
                  <td className="pr-4 tnum">{row.roce}%</td>
                  <td className="pr-4 tnum">{row.de}x</td>
                  <td className={`pr-4 tnum font-bold ${row.cfoCr < 0 ? "text-[#FF5C5C]" : "text-[#9db82a] dark:text-[#D4FF4F]"}`}>₹{row.cfoCr} Cr</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 grid gap-2 md:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">📈 3-yr revenue CAGR <b>{growth}%</b></div>
            <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">💰 PAT margin <b>{margin}%</b> · CFO/PAT <b>{(f[2].cfoCr / f[2].patCr).toFixed(2)}x</b></div>
            <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">⚖️ Peers → {ipo.peers.length ? ipo.peers.slice(1).map((p) => `${p.name} ${p.pe}x`).join(" · ") : "—"}</div>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-[2rem] border border-dashed border-white/20 p-6 md:p-8 text-center">
          <div className="font-display text-2xl font-black">📑 Dossier building…</div>
          <p className="mt-2 text-sm opacity-60 max-w-xl mx-auto">NSE calendar data is live above. Restated financials, peers and DRHP forensics auto-attach once the offer document is parsed — usually within a day of the RHP.</p>
        </section>
      )}

      {/* FAQ — real investor questions, answered from the dossier (AEO) */}
      <section className="mt-6 rounded-[2rem] border border-white/10 p-6 md:p-8">
        <h3 className="font-display text-2xl font-black">Questions investors ask about {ipo.company}</h3>
        <div className="mt-4 space-y-4">
          {faqs.map(([q, a]) => (
            <div key={q}>
              <h4 className="font-bold">{q}</h4>
              <p className="mt-1 text-sm opacity-70">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ACTION */}
      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-[2rem] border border-white/10 p-6">
          <h4 className="font-bold flex items-center gap-2"><Users className="size-4" /> Who should apply?</h4>
          <ul className="mt-3 text-sm space-y-2 opacity-80">
            <li>• Listing trader → {l.score >= 6 ? "yes, momentum is real" : "no, setup is weak"}</li>
            <li>• Long-term holder → {hasFin ? (lt.score >= 6 ? "yes, business quality shows" : "wait for cheaper re-entry") : "wait for the full dossier"}</li>
            <li>• First-time investor → {lt.score >= 7 && l.score >= 6 ? "great starter IPO" : "learn by watching, not betting"}</li>
          </ul>
        </div>
        <div className="rounded-[2rem] border border-white/10 p-6">
          <h4 className="font-bold flex items-center gap-2"><AlertTriangle className="size-4" /> Listing-day playbook</h4>
          <ul className="mt-3 text-sm space-y-2 opacity-80">
            <li>• Opens +40%↑ → book half, keep rest at cost stop</li>
            <li>• Opens flat ±5% → hold only if long-term score ≥7</li>
            <li>• Opens discount → never average down Day 1</li>
          </ul>
        </div>
        <div className="rounded-[2rem] border border-white/10 p-6">
          <h4 className="font-bold flex items-center gap-2"><FileText className="size-4" /> Docs + allotment</h4>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <span className="opacity-60">DRHP/RHP on SEBI + Exchange (source-linked after scrape)</span>
            <a className="inline-flex items-center gap-1 font-bold" href="https://www.bseindia.com/investors/appli_check.aspx" target="_blank" rel="noreferrer">Check allotment on BSE <ExternalLink className="size-3" /></a>
            <span className="font-mono2 text-xs opacity-60 flex items-center gap-1"><Building2 className="size-3" /> Registrar: {ipo.registrar || "—"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
