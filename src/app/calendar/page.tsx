import { getAllIpos } from "@/lib/ipos";
import { Reveal } from "@/components/reveal";
import Link from "next/link";
import { fmtDate } from "@/lib/utils";

export const revalidate = 1800;

export default async function CalendarPage() {
  const IPOS = await getAllIpos();
  const byOpen = (a: (typeof IPOS)[number], b: (typeof IPOS)[number]) => +new Date(a.openDate || "9999") - +new Date(b.openDate || "9999");
  // Apply season first: live (most urgent close first), then upcoming.
  // Listed history drops to a collapsed section at the bottom.
  const live = IPOS.filter((i) => i.status === "live").sort(
    (a, b) => +new Date(a.closeDate || "9999") - +new Date(b.closeDate || "9999")
  );
  const upcoming = IPOS.filter((i) => i.status === "upcoming").sort(byOpen);
  const listed = IPOS.filter((i) => i.status !== "live" && i.status !== "upcoming").sort(byOpen).reverse();

  const row = (ipo: (typeof IPOS)[number], dim = false) => (
    <Reveal key={ipo.slug}>
      <Link href={`/ipo/${ipo.slug}`} className={`relative ml-10 block rounded-3xl border border-white/10 p-5 hover:bg-white/5 transition-colors ${dim ? "opacity-60" : ""}`}>
        <span className={`absolute -left-10 top-6 size-3 rounded-full ${ipo.status === "live" ? "bg-[#D4FF4F] animate-pulse-dot" : "bg-white/30"}`} />
        <div className="flex flex-wrap items-center gap-3">
          <b className="font-display text-xl">{ipo.company}</b>
          <span className="font-mono2 text-[11px] rounded-full bg-white/10 px-2.5 py-1">{ipo.status.toUpperCase()}</span>
          <span className="font-mono2 text-xs opacity-60 ml-auto">₹{ipo.priceMin}–₹{ipo.priceMax}</span>
        </div>
        <div className="mt-2 font-mono2 text-xs opacity-70">
          OPEN {fmtDate(ipo.openDate)} → CLOSE {fmtDate(ipo.closeDate)} → ALLOT {fmtDate(ipo.allotmentDate)} → LIST {fmtDate(ipo.listingDate)}
        </div>
      </Link>
    </Reveal>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">NEVER MISS A WINDOW · ASBA VIA UPI BEFORE 5PM CUT-OFF</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">IPO Calendar</h1>
      </Reveal>

      {live.length > 0 && (
        <>
          <h2 className="font-display mt-10 text-2xl font-black">🔴 Live now — bidding open</h2>
          <div className="mt-4 relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/15" />
            <div className="space-y-4">{live.map((ipo) => row(ipo))}</div>
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="font-display mt-10 text-2xl font-black">⏳ Opening soon</h2>
          <div className="mt-4 relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/15" />
            <div className="space-y-4">{upcoming.map((ipo) => row(ipo))}</div>
          </div>
        </>
      )}

      {listed.length > 0 && (
        <details className="mt-10 rounded-3xl border border-white/10 p-5">
          <summary className="cursor-pointer font-display text-xl font-black opacity-70 hover:opacity-100">
            Recently listed ({listed.length}) — history
          </summary>
          <div className="mt-4 relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/15" />
            <div className="space-y-4">{listed.map((ipo) => row(ipo, true))}</div>
          </div>
        </details>
      )}
    </div>
  );
}
