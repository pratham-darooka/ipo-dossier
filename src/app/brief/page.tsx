import Link from "next/link";
import type { Metadata } from "next";
import { getAllIpos } from "@/lib/ipos";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo";
import { fmtDate } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPO morning brief: live demand, GMP movers, opening soon",
  description: "Daily pre-open snapshot of India's mainboard IPOs: live subscription multiples, GMP movers, upcoming opens and fresh listings.",
  alternates: { canonical: `${SITE_URL}/brief` },
};

export default async function BriefPage() {
  const all = await getAllIpos();
  const live = all.filter((i) => i.status === "live");
  const upcoming = all.filter((i) => i.status === "upcoming").slice(0, 6);
  const fresh = all.filter((i) => i.listingPrice != null).slice(0, 5);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: `IPO morning brief — ${today}`, datePublished: new Date().toISOString(), author: { "@type": "Organization", name: "IPO Dossier", url: SITE_URL } }} />
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">PRE-OPEN · {today.toUpperCase()} · 9:00 IST SNAPSHOT</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Morning brief</h1>
        <p className="mt-4 max-w-2xl opacity-70">
          {live.length ? `${live.length} IPO${live.length > 1 ? "s" : ""} open for bidding. ` : "No IPO open right now. "}
          {live.length ? `Strongest demand: ${[...live].sort((a, b) => b.subscription.total - a.subscription.total)[0].company} at ${[...live].sort((a, b) => b.subscription.total - a.subscription.total)[0].subscription.total}x. ` : ""}
          GMP is unofficial sentiment — subscription, esp QIB, is the substance.
        </p>
      </Reveal>

      <Reveal>
        <h2 className="font-display mt-10 text-3xl font-black">Live demand</h2>
        <div className="mt-4 space-y-3">
          {live.map((i) => (
            <Link key={i.slug} href={`/ipo/${i.slug}`} className="flex items-center gap-4 rounded-3xl border border-white/10 p-5 hover:bg-white/5">
              <div className="flex-1">
                <div className="font-bold text-lg">{i.company}</div>
                <div className="font-mono2 text-xs opacity-60">QIB {i.subscription.qib}x · NII {i.subscription.nii}x · RET {i.subscription.retail}x{i.gmp.at ? ` · GMP as of ${new Date(i.gmp.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</div>
              </div>
              <div className="font-mono2 font-black text-xl tnum">{i.subscription.total ? `${i.subscription.total}x` : "—"}</div>
            </Link>
          ))}
          {!live.length && <p className="opacity-60">Nothing bidding today — check upcoming opens below.</p>}
        </div>
      </Reveal>

      <Reveal>
        <h2 className="font-display mt-10 text-3xl font-black">Opening soon</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {upcoming.map((i) => (
            <Link key={i.slug} href={`/ipo/${i.slug}`} className="rounded-3xl border border-white/10 p-5 hover:bg-white/5">
              <div className="font-bold">{i.company}</div>
              <div className="font-mono2 text-xs opacity-60 mt-1">{i.openDate ? `Opens ${fmtDate(i.openDate)}` : "Dates awaited"} · {i.priceMax ? `₹${i.priceMin}–₹${i.priceMax}` : "Band awaited"}</div>
            </Link>
          ))}
        </div>
      </Reveal>

      {fresh.length > 0 && (
        <Reveal>
          <h2 className="font-display mt-10 text-3xl font-black">Fresh listings</h2>
          <div className="mt-4 space-y-3">
            {fresh.map((i) => (
              <Link key={i.slug} href={`/ipo/${i.slug}`} className="flex items-center gap-4 rounded-3xl border border-white/10 p-5 hover:bg-white/5">
                <div className="flex-1 font-bold">{i.company}</div>
                <div className="font-mono2 tnum">₹{i.listingPrice} <span className={(i.listingGainPct ?? 0) >= 0 ? "text-[#9db82a] dark:text-[#D4FF4F]" : "text-[#FF5C5C]"}>({i.listingGainPct}%)</span></div>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
      <p className="mt-8 font-mono2 text-[11px] opacity-50">Educational only — not investment advice. Data: NSE official feeds, synced daily.</p>
    </div>
  );
}
