"use client";

import { useMemo, useState } from "react";
import { minInvestment, type IpoSeed } from "@/lib/data";
import { Reveal } from "@/components/reveal";
import { useIpos } from "@/components/use-ipos";

function margin(ipo: IpoSeed) {
  const f = ipo.financials[2];
  if (!f?.revenueCr) return "—";
  return `${((f.patCr / f.revenueCr) * 100).toFixed(1)}%`;
}
function roe(ipo: IpoSeed) {
  const f = ipo.financials[2];
  return f ? `${f.roe}%` : "—";
}

export default function ComparePage() {
  const IPOS = useIpos();
  const [a, setA] = useState(IPOS[0].slug);
  const [b, setB] = useState(IPOS[1]?.slug ?? IPOS[0].slug);
  const A = useMemo(() => IPOS.find((i) => i.slug === a) ?? IPOS[0], [IPOS, a]);
  const B = useMemo(() => IPOS.find((i) => i.slug === b) ?? IPOS[1] ?? IPOS[0], [IPOS, b]);

  const rows: [string, string | number, string | number, string?][] = [
    ["Issue size", A.issueSizeCr ? `₹${A.issueSizeCr} Cr` : "—", B.issueSizeCr ? `₹${B.issueSizeCr} Cr` : "—"],
    ["Price band", A.priceMax ? `₹${A.priceMin}–₹${A.priceMax}` : "Awaited", B.priceMax ? `₹${B.priceMin}–₹${B.priceMax}` : "Awaited"],
    ["Min investment", A.lotSize ? `₹${minInvestment(A).toLocaleString("en-IN")}` : "—", B.lotSize ? `₹${minInvestment(B).toLocaleString("en-IN")}` : "—"],
    ["Fresh issue", `${A.freshIssuePct}%`, `${B.freshIssuePct}%`, A.freshIssuePct > B.freshIssuePct ? "A funds more growth" : B.freshIssuePct > A.freshIssuePct ? "B funds more growth" : "Tie"],
    ["QIB / Total sub", `${A.subscription.qib}x / ${A.subscription.total}x`, `${B.subscription.qib}x / ${B.subscription.total}x`, A.subscription.qib > B.subscription.qib ? "A has smarter money" : "B has smarter money"],
    ["GMP", A.gmp.pct ? `+${A.gmp.pct}%` : "—", B.gmp.pct ? `+${B.gmp.pct}%` : "—", A.gmp.pct > B.gmp.pct ? "A hotter (crowded)" : "B hotter (crowded)"],
    ["PAT margin", margin(A), margin(B)],
    ["ROE", roe(A), roe(B)],
    ["Promoter post", A.promoterPost ? `${A.promoterPost}%` : "—", B.promoterPost ? `${B.promoterPost}%` : "—"],
  ];

  const pick = (v: string, set: (s: string) => void) => (
    <select value={v} onChange={(e) => set(e.target.value)} className="w-full rounded-2xl border border-white/15 bg-transparent p-3 font-bold">
      {IPOS.map((i) => <option key={i.slug} value={i.slug} className="text-black">{i.company}</option>)}
    </select>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">SIDE-BY-SIDE · MOMENTUM VS QUALITY</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Compare IPOs</h1>
      </Reveal>
      <div className="mt-6 grid gap-3 md:grid-cols-2">{pick(a, setA)}{pick(b, setB)}</div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-mono2 text-xs opacity-60">
              <th className="text-left p-4">METRIC</th>
              <th className="text-left p-4">{A.company}</th>
              <th className="text-left p-4">{B.company}</th>
              <th className="text-left p-4 hidden md:table-cell">EDGE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, av, bv, edge]) => (
              <tr key={k} className="border-t border-white/10 font-mono2">
                <td className="p-4 opacity-60">{k}</td>
                <td className="p-4 font-bold tnum">{av}</td>
                <td className="p-4 font-bold tnum">{bv}</td>
                <td className="p-4 hidden md:table-cell text-[#9db82a] dark:text-[#D4FF4F]">{edge ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono2 text-xs opacity-50">Rule of thumb: pick high QIB + high fresh-issue + cash-backed profit. GMP alone picks the crowd, not the compounder.</p>
    </div>
  );
}
