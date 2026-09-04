import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="font-display text-xl font-black">IPO Dossier</div>
          <p className="mt-2 opacity-60 max-w-sm">
            Mainboard-only intelligence: live subscription, GMP sentiment, DRHP forensics, valuation vs peers.
            Educational — not investment advice. GMP is unofficial and never a guarantee.
          </p>
        </div>
        <div className="font-mono2 text-xs opacity-70 space-y-1">
          <div>SOURCES → NSE · BSE · SEBI DRHP · RHP · Registrars</div>
          <div>AI → Groq Llama-3.3 (grounded on filings only)</div>
          <div>DATA → Neon Postgres · Vercel Cron 30min</div>
        </div>
        <div className="flex md:justify-end gap-3 items-start flex-wrap">
          <Link href="/status" className="rounded-full border border-[#D4FF4F]/40 px-4 py-2">● System status</Link>
          <Link href="/studio" className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/5">Studio</Link>
          <Link href="/performance" className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/5">GMP accuracy</Link>
          <Link href="/calendar" className="rounded-full bg-white text-black px-4 py-2 font-semibold dark:bg-[#D4FF4F]">Calendar</Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center font-mono2 text-[11px] opacity-50">
        SEBI: investing in securities is subject to market risk. Do your own research. No buy/sell recommendation.
      </div>
    </footer>
  );
}
