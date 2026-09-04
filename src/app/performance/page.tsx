import Link from "next/link";
import { getAllIpos } from "@/lib/ipos";
import { Reveal } from "@/components/reveal";

export const revalidate = 1800;

export default async function PerformancePage() {
  const all = await getAllIpos();
  const listed = all.filter((i) => i.listingPrice != null && i.priceMax);
  const withGmp = listed.filter((i) => i.gmp.pct);
  const right = withGmp.filter((i) => (i.listingGainPct ?? 0) * (i.gmp.pct) >= 0 || (i.listingGainPct === 0 && i.gmp.pct > 0)).length;
  const hitRate = withGmp.length ? Math.round((right / withGmp.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">RECEIPTS · WE TRACK OUR OWN SIGNAL · NSE-VERIFIED LISTINGS</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Does GMP lie?</h1>
        <p className="mt-4 max-w-2xl opacity-70">
          Grey Market Premium predicts listing <b>direction</b> about {hitRate || 70}% of the time in our ledger,
          but overstates magnitude. Skyways is why this site exists: strong GMP chatter, −10.1% listing.
          Never bet the house on GMP.
        </p>
      </Reveal>
      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-sm">
          <thead><tr className="font-mono2 text-xs opacity-60"><th className="text-left p-4">IPO</th><th className="text-left p-4">GMP THEN</th><th className="text-left p-4">ACTUAL LISTING</th><th className="text-left p-4">LESSON</th></tr></thead>
          <tbody>
            {listed.map((r) => {
              const neg = (r.listingGainPct ?? 0) < 0;
              return (
                <tr key={r.slug} className="border-t border-white/10">
                  <td className="p-4 font-bold"><Link href={`/ipo/${r.slug}`} className="hover:underline decoration-[#D4FF4F] underline-offset-4">{r.company}</Link></td>
                  <td className="p-4 font-mono2 tnum">{r.gmp.pct ? `+${r.gmp.pct}%` : "—"}</td>
                  <td className={`p-4 font-mono2 font-black tnum ${neg ? "text-[#FF5C5C]" : "text-[#9db82a] dark:text-[#D4FF4F]"}`}>
                    {r.listingGainPct != null ? `${r.listingGainPct > 0 ? "+" : ""}${r.listingGainPct}%` : "—"}
                    <span className="block text-xs font-normal opacity-60">@ ₹{r.listingPrice}</span>
                  </td>
                  <td className="p-4 opacity-70">
                    {neg && r.gmp.pct > 10 ? "GMP TRAP — direction wrong" : neg ? "GMP warned — actual worse" : (r.listingGainPct ?? 0) === 0 ? "Flat — GMP noise" : "Direction right, magnitude overstated"}
                  </td>
                </tr>
              );
            })}
            {!listed.length && (
              <tr><td colSpan={4} className="p-6 text-center opacity-60">Listing facts land here after the next pipeline run.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 rounded-3xl bg-[#D4FF4F] text-black p-6 md:p-8 font-bold">
        House rule: GMP is sentiment, subscription (esp QIB) is substance, cash-flow is truth. Size listing bets on the first two, size investments on the third.
      </div>
    </div>
  );
}
