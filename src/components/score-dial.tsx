"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function ScoreDial({ score, label, tone = "gain" }: { score: number; label: string; tone?: "gain" | "gold" | "loss" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1200);
      setV(score * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, score]);

  const R = 52;
  const C = 2 * Math.PI * R;
  const color = tone === "gain" ? "#D4FF4F" : tone === "gold" ? "#E8C15A" : "#FF5C5C";

  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="relative size-28">
        <svg viewBox="0 0 120 120" className="size-28 -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" />
          <motion.circle
            cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} initial={{ strokeDashoffset: C }}
            animate={inView ? { strokeDashoffset: C - (C * v) / 10 } : {}}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-mono2 text-2xl font-black tnum">{v.toFixed(1)}</div>
            <div className="text-[10px] opacity-50">/10</div>
          </div>
        </div>
      </div>
      <div>
        <div className="font-mono2 text-[11px] tracking-[0.2em] opacity-60">{label}</div>
        <div className="font-display text-xl font-bold">{score >= 7 ? "Apply zone" : score >= 5 ? "Neutral" : "Avoid zone"}</div>
      </div>
    </div>
  );
}
