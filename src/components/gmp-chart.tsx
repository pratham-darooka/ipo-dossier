"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type GmpPoint = { t: string; value: number };

/** Per-day GMP tape. Renders from real tracked points only — never interpolated. */
export function GmpChart({ history, current }: { history: GmpPoint[]; current: number }) {
  const pts = [...history]
    .filter((p) => p && typeof p.value === "number" && p.t)
    .sort((a, b) => +new Date(a.t) - +new Date(b.t))
    .slice(-30);
  if (pts.length < 2) return null;
  const data = pts.map((p) => ({
    ...p,
    day: new Date(p.t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));
  const min = Math.min(...pts.map((p) => p.value));
  const max = Math.max(...pts.map((p) => p.value));
  const pad = Math.max(1, Math.round((max - min) * 0.2));
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <div className="font-mono2 text-[11px] tracking-[0.18em] opacity-60">GREY MARKET TAPE · UNOFFICIAL</div>
        <div className="font-mono2 text-sm font-black tnum">₹{current}</div>
      </div>
      <div className="h-44 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="gmpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4FF4F" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#D4FF4F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[min - pad, max + pad]} tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              contentStyle={{ background: "#10141C", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 }}
              formatter={(v) => [`₹${v}`, "GMP"]}
              labelFormatter={(l) => `GMP · ${l}`}
            />
            <Area type="monotone" dataKey="value" stroke="#D4FF4F" strokeWidth={2.5} fill="url(#gmpFill)" dot={{ r: 3, fill: "#D4FF4F" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 font-mono2 text-[10px] opacity-40">Unofficial chatter, tracked daily — direction signal, never a promise.</p>
    </div>
  );
}
