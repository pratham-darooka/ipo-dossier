"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { useIpos } from "@/components/use-ipos";

const KEY = "ipo-dossier-watchlist";

export default function WatchlistPage() {
  const IPOS = useIpos();
  const [list, setList] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const toggle = (slug: string) => {
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
    setList(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12">
      <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">YOUR SHORTLIST · STORED LOCALLY</div>
      <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Watchlist</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {IPOS.map((ipo) => {
          const on = list.includes(ipo.slug);
          return (
            <div key={ipo.slug} className="flex items-center gap-4 rounded-3xl border border-white/10 p-5">
              <button onClick={() => toggle(ipo.slug)} aria-label="toggle watch" className={`grid size-11 place-items-center rounded-full border ${on ? "bg-[#D4FF4F] text-black border-transparent" : "border-white/15"}`}>
                <Star className="size-5" fill={on ? "currentColor" : "none"} />
              </button>
              <div className="flex-1">
                <div className="font-bold">{ipo.company}</div>
                <div className="font-mono2 text-xs opacity-60">{ipo.priceMax ? `₹${ipo.priceMin}–₹${ipo.priceMax}` : "Band awaited"} · {ipo.gmp.pct ? `GMP +${ipo.gmp.pct}%` : `SUB ${ipo.subscription.total || "—"}x`}</div>
              </div>
              <Link href={`/ipo/${ipo.slug}`} className="text-sm font-bold underline decoration-[#D4FF4F] underline-offset-4">Dossier</Link>
            </div>
          );
        })}
      </div>
      {list.length > 0 && <p className="mt-4 font-mono2 text-xs opacity-60">Tracking {list.length} IPO(s). In production this syncs to Neon + triggers alerts on GMP/subscription spikes.</p>}
    </div>
  );
}
