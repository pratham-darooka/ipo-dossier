import { Reveal } from "@/components/reveal";

const ROWS = [
  { ipo: "Lumino Industries", gmp: "+46.3%", actual: "+34.1%", verdict: "GMP overstated, direction right" },
  { ipo: "Kwick Forensic", gmp: "+86.7%", actual: "+66.7%", verdict: "Euphoria trimmed, still multibagger pop" },
  { ipo: "Annu Projects", gmp: "−7.1%", actual: "−27.3%", verdict: "GMP warned — actual was worse" },
  { ipo: "Hy-Tech Engineers", gmp: "+66.0%", actual: "+41.5%", verdict: "Classic 20-pt haircut" },
  { ipo: "Symbiotec Pharmalab", gmp: "+18.7%", actual: "0.0%", verdict: "Flat — GMP noise" },
  { ipo: "Skyways Air", gmp: "+23.2%", actual: "−10.1%", verdict: "GMP TRAP — direction wrong" },
];

export default function PerformancePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">RECEIPTS · WE TRACK OUR OWN SIGNAL</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Does GMP lie?</h1>
        <p className="mt-4 max-w-2xl opacity-70">
          Grey Market Premium predicts listing <b>direction</b> ~70% of the time, but overstates magnitude by ~15-20 points.
          Skyways is why this site exists: +23% GMP, −10% listing. Never bet the house on GMP.
        </p>
      </Reveal>
      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-sm">
          <thead><tr className="font-mono2 text-xs opacity-60"><th className="text-left p-4">IPO</th><th className="text-left p-4">DAY-3 GMP</th><th className="text-left p-4">ACTUAL LISTING</th><th className="text-left p-4">LESSON</th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.ipo} className="border-t border-white/10">
                <td className="p-4 font-bold">{r.ipo}</td>
                <td className="p-4 font-mono2 tnum">{r.gmp}</td>
                <td className={`p-4 font-mono2 font-black tnum ${r.actual.startsWith("-") ? "text-[#FF5C5C]" : "text-[#9db82a] dark:text-[#D4FF4F]"}`}>{r.actual}</td>
                <td className="p-4 opacity-70">{r.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 rounded-3xl bg-[#D4FF4F] text-black p-6 md:p-8 font-bold">
        House rule: GMP is sentiment, subscription (esp QIB) is substance, cash-flow is truth. Size listing bets on the first two, size investments on the third.
      </div>
    </div>
  );
}
