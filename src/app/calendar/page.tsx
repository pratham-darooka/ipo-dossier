import { getAllIpos } from "@/lib/ipos";
import { Reveal } from "@/components/reveal";
import Link from "next/link";
import { fmtDate } from "@/lib/utils";

export const revalidate = 1800;

export default async function CalendarPage() {
  const IPOS = await getAllIpos();
  const sorted = [...IPOS].sort((a, b) => +new Date(a.openDate) - +new Date(b.openDate));
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">NEVER MISS A WINDOW · ASBA VIA UPI BEFORE 5PM CUT-OFF</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">IPO Calendar</h1>
      </Reveal>
      <div className="mt-8 relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/15" />
        <div className="space-y-4">
          {sorted.map((ipo) => (
            <Reveal key={ipo.slug}>
              <Link href={`/ipo/${ipo.slug}`} className="relative ml-10 block rounded-3xl border border-white/10 p-5 hover:bg-white/5 transition-colors">
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
          ))}
        </div>
      </div>
    </div>
  );
}
