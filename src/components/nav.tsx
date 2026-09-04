"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useIpos } from "@/components/use-ipos";

const LINKS = [
  { href: "/", label: "Live" },
  { href: "/brief", label: "Brief" },
  { href: "/calendar", label: "Calendar" },
  { href: "/compare", label: "Compare" },
  { href: "/performance", label: "GMP Truth" },
  { href: "/watchlist", label: "Watchlist" },
];

export function Nav() {
  const path = usePathname();
  const { theme, setTheme } = useTheme();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // next-themes hydration guard — intentional mount flag
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const IPOS = useIpos();
  const results = q ? IPOS.filter((i) => i.company.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10 bg-black/40 dark:bg-black/60 bg-[#FAF7F0]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="grid size-9 place-items-center rounded-xl bg-[#D4FF4F] text-black font-black">
            <Zap className="size-5" strokeWidth={2.5} />
          </span>
          <span className="leading-none">
            <span className="font-display block text-lg font-black tracking-tight">IPO Dossier</span>
            <span className="font-mono2 block text-[10px] tracking-[0.22em] text-muted">MAINBOARD · NSE BSE</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition-all",
                path === l.href ? "bg-white text-black dark:bg-[#D4FF4F] dark:text-black font-semibold" : "hover:bg-white/10 text-current"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search IPOs…  (⌘K)"
              className="w-52 focus:w-72 transition-all rounded-full border border-white/15 bg-white/5 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#D4FF4F]/60"
            />
            {open && results.length > 0 && (
              <div className="absolute top-11 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#10141C] shadow-2xl">
                {results.map((r) => (
                  <Link key={r.slug} href={`/ipo/${r.slug}`} className="block px-4 py-3 hover:bg-white/5">
                    <div className="text-sm font-semibold">{r.company}</div>
                    <div className="font-mono2 text-xs opacity-60">₹{r.priceMin}–₹{r.priceMax} · {r.status}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid size-10 place-items-center rounded-full border border-white/15 hover:bg-white/10"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          )}
          <Link href="/calendar" className="hidden sm:inline-flex rounded-full bg-[#D4FF4F] px-5 py-2.5 text-sm font-bold text-black hover:brightness-110">
            Apply season
          </Link>
        </div>
      </div>
      <div className="md:hidden flex gap-1 px-4 pb-3 overflow-x-auto">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={cn("rounded-full px-3 py-1.5 text-xs whitespace-nowrap border border-white/10", path === l.href && "bg-[#D4FF4F] text-black font-bold")}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
