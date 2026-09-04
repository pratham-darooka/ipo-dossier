import { IPOS } from "@/lib/data";

export function TickerTape() {
  const items = IPOS.map((i) => ({
    name: i.company.split(" ")[0],
    gmp: `+${i.gmp.pct}%`,
    up: i.gmp.pct >= 0,
    sub: `${i.subscription.total || "—"}x`,
  }));
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-black text-white dark:bg-black bg-[#10141C]">
      <div className="flex w-max animate-ticker gap-0 py-2.5 font-mono2 text-xs">
        {row.map((t, idx) => (
          <span key={idx} className="flex items-center gap-2 px-5 whitespace-nowrap">
            <span className={`size-1.5 rounded-full ${t.up ? "bg-[#D4FF4F] animate-pulse-dot" : "bg-[#FF5C5C]"}`} />
            <b>{t.name}</b>
            <span className={t.up ? "text-[#D4FF4F]" : "text-[#FF5C5C]"}>{t.gmp}</span>
            <span className="opacity-50">SUB {t.sub}</span>
            <span className="opacity-20 pl-4">{"///"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
