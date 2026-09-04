import type { ReactNode } from "react";
import type { IpoSeed } from "../data";
import { scoreListing, scoreLongTerm, verdict } from "../scoring";

export const W = 1080;
export const H = 1350;

/** Shared 4:5 frame. satori-safe: no custom fonts, no emoji, no external CSS. */
export function Frame({ children, foot }: { children: ReactNode; foot: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: H,
        background: "#080A0F",
        color: "#F2F4F8",
        padding: 72,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#D4FF4F",
            color: "#080A0F",
            fontSize: 32,
            fontWeight: 900,
          }}
        >
          D
        </div>
        <div style={{ fontSize: 26, letterSpacing: 5, color: "#D4FF4F", fontWeight: 700 }}>IPO DOSSIER</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid rgba(255,255,255,0.15)",
          paddingTop: 24,
          fontSize: 24,
          color: "#8A94A6",
        }}
      >
        <span>{foot}</span>
        <span>ipo-dossier.vercel.app</span>
      </div>
    </div>
  );
}

function Pill({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignSelf: "flex-start",
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: "10px 26px",
        fontSize: 30,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = value > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
        <span style={{ color: "#8A94A6" }}>{label}</span>
        <span style={{ fontWeight: 900 }}>{value > 0 ? `${value}x` : "—"}</span>
      </div>
      <div style={{ display: "flex", height: 18, borderRadius: 9, background: "rgba(255,255,255,0.12)", marginTop: 10 }}>
        <div style={{ width: `${pct}%`, borderRadius: 9, background: "#D4FF4F" }} />
      </div>
    </div>
  );
}

export function ipoScores(ipo: IpoSeed) {
  const f = ipo.financials;
  const hasFull = f.length >= 3;
  const last = f[f.length - 1];
  const growth = f.length >= 2 && f[0].revenueCr ? Math.round(((last.revenueCr / f[0].revenueCr) ** (1 / (f.length - 1)) - 1) * 100) : 0;
  const l = scoreListing({
    subscriptionTotal: ipo.subscription.total || undefined,
    qib: ipo.subscription.qib || undefined,
    gmpPct: ipo.gmp.pct || undefined,
    anchorPct: ipo.anchorPct || undefined,
    freshIssuePct: ipo.freshIssuePct || undefined,
  });
  const lt = scoreLongTerm({
    revenueGrowth3y: hasFull ? growth : undefined,
    patMargin: hasFull && last.revenueCr ? Math.round((last.patCr / last.revenueCr) * 100) : undefined,
    cfoVsPat: hasFull && last.patCr ? last.cfoCr / last.patCr : undefined,
    redFlags: ipo.risks.length || undefined,
    freshIssuePct: ipo.freshIssuePct || undefined,
  });
  return { l, lt, vl: verdict(l.score), vlt: hasFull ? verdict(lt.score) : ("NEUTRAL" as const) };
}

const vColor = (v: string) => (v === "APPLY" ? "#D4FF4F" : v === "AVOID" ? "#FF5C5C" : "#E8C15A");

/** Slide 1: cover */
export function CoverSlide({ ipo, n, of }: { ipo: IpoSeed; n: number; of: number }) {
  const { l, lt, vl, vlt } = ipoScores(ipo);
  return (
    <Frame foot={`SLIDE ${n}/${of} · MAINBOARD · NSE BSE`}>
      <div style={{ fontSize: 30, color: "#8A94A6", letterSpacing: 3 }}>{`${ipo.sector.toUpperCase()} · ${ipo.status.toUpperCase()}`}</div>
      <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.02, marginTop: 18 }}>{ipo.company}</div>
      <div style={{ fontSize: 40, marginTop: 22, color: "#E8E8E8", display: "flex", flexWrap: "wrap" }}>
        {ipo.priceMax > 0 ? <span>₹{ipo.priceMin}–₹{ipo.priceMax}  ·  Lot {ipo.lotSize || "—"}</span> : <span>Price band awaited</span>}
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
        <Pill bg="#FFFFFF" fg="#080A0F">
          LIST {l.score.toFixed(1)} · {vl}
        </Pill>
        <Pill bg="transparent" fg={vColor(vlt)}>
          LONG {lt.score.toFixed(1)} · {vlt}
        </Pill>
      </div>
      <div style={{ fontSize: 34, marginTop: 44, color: "#D4FF4F", fontWeight: 700 }}>Apply or avoid? Swipe →</div>
    </Frame>
  );
}

/** Slide 2: demand tape */
export function DemandSlide({ ipo, n, of }: { ipo: IpoSeed; n: number; of: number }) {
  const s = ipo.subscription;
  const max = Math.max(s.qib, s.nii, s.retail, 1);
  return (
    <Frame foot={`SLIDE ${n}/${of} · LIVE NSE DEMAND`}>
      <div style={{ fontSize: 64, fontWeight: 900 }}>{`Who's actually bidding?`}</div>
      <div style={{ fontSize: 32, color: "#8A94A6", marginTop: 8 }}>QIB is smart money. Watch it converge.</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
        <Bar label="QIB (institutions)" value={s.qib} max={max} />
        <Bar label="NII (HNI)" value={s.nii} max={max} />
        <Bar label="Retail (you)" value={s.retail} max={max} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 44, fontSize: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 30px" }}>
          <span>TOTAL</span><b>{s.total > 0 ? `${s.total}x` : "Not open"}</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 30px" }}>
          <span>GMP</span><b>{ipo.gmp.pct > 0 ? `+${ipo.gmp.pct}%` : "—"}</b>
        </div>
      </div>
    </Frame>
  );
}

/** Slide 3: money + financials */
export function MoneySlide({ ipo, n, of }: { ipo: IpoSeed; n: number; of: number }) {
  const f = ipo.financials.slice(-3);
  const maxRev = Math.max(...f.map((r) => r.revenueCr), 1);
  const sub = `${ipo.issueSizeCr > 0 ? `Issue ₹${ipo.issueSizeCr} Cr · ` : ""}${ipo.freshIssuePct > 0 ? `${ipo.freshIssuePct}% fresh capital` : "Structure awaited"}`;
  return (
    <Frame foot={`SLIDE ${n}/${of} · WHERE THE MONEY GOES`}>
      <div style={{ fontSize: 64, fontWeight: 900 }}>Follow the money</div>
      <div style={{ fontSize: 34, marginTop: 12 }}>{sub}</div>
      {f.length > 0 ? (
        <div style={{ display: "flex", gap: 24, marginTop: 36, alignItems: "flex-end" }}>
          {f.map((r) => (
            <div key={r.fy} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{ fontSize: 30, fontWeight: 900 }}>{`₹${r.revenueCr} Cr`}</div>
              <div
                style={{
                  width: "100%",
                  height: Math.max(24, Math.round((r.revenueCr / maxRev) * 300)),
                  background: "#D4FF4F",
                  borderRadius: 12,
                  marginTop: 12,
                }}
              />
              <div style={{ fontSize: 28, color: "#8A94A6", marginTop: 10 }}>{`${r.fy} · PAT ₹${r.patCr} Cr`}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 34, color: "#8A94A6", marginTop: 36 }}>Restated financials attach here the day the RHP drops.</div>
      )}
      {ipo.objectsOfIssue.length > 0 && (
        <div style={{ fontSize: 30, marginTop: 30, color: "#E8E8E8" }}>{`→ ${ipo.objectsOfIssue[0].slice(0, 90)}`}</div>
      )}
    </Frame>
  );
}

/** Slide 4: verdict duo */
export function VerdictSlide({ ipo, n, of }: { ipo: IpoSeed; n: number; of: number }) {
  const { l, lt, vl, vlt } = ipoScores(ipo);
  const top = (arr: string[]) => (arr.length ? arr.slice(0, 2) : ["Watching Day-1 tape"]);
  return (
    <Frame foot={`SLIDE ${n}/${of} · TWO VERDICTS, NO TIPS`}>
      <div style={{ fontSize: 64, fontWeight: 900 }}>Our take</div>
      <div style={{ display: "flex", gap: 24, marginTop: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(212,255,79,0.1)", borderRadius: 24, padding: 30 }}>
          <div style={{ fontSize: 26, color: "#D4FF4F", fontWeight: 800 }}>LISTING TRADER</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontSize: 54, fontWeight: 900, marginTop: 6 }}>
            <span>{vl}</span><span style={{ fontSize: 32 }}>{l.score.toFixed(1)}/10</span>
          </div>
          {top(l.reasons).map((r) => (
            <div key={r} style={{ fontSize: 27, marginTop: 10, color: "#E8E8E8" }}>
              {`> ${r.slice(0, 90)}`}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(232,193,90,0.1)", borderRadius: 24, padding: 30 }}>
          <div style={{ fontSize: 26, color: "#E8C15A", fontWeight: 800 }}>LONG-TERM</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontSize: 54, fontWeight: 900, marginTop: 6 }}>
            <span>{vlt}</span><span style={{ fontSize: 32 }}>{lt.score.toFixed(1)}/10</span>
          </div>
          {top(lt.reasons).map((r) => (
            <div key={r} style={{ fontSize: 27, marginTop: 10, color: "#E8E8E8" }}>
              {`> ${r.slice(0, 90)}`}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** Slide 5: action + CTA */
export function ActionSlide({ n, of }: { ipo?: IpoSeed; n: number; of: number }) {
  return (
    <Frame foot={`SLIDE ${n}/${of} · EDUCATION, NOT ADVICE`}>
      <div style={{ fontSize: 64, fontWeight: 900 }}>Listing-day playbook</div>
      <div style={{ marginTop: 24, fontSize: 34, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>▲ Opens +40% → book half, trail rest at cost</div>
        <div>● Opens flat ±5% → hold only if LONG ≥ 7</div>
        <div>▼ Opens discount → never average down Day 1</div>
      </div>
      <div
        style={{
          marginTop: 44,
          background: "#D4FF4F",
          color: "#080A0F",
          borderRadius: 24,
          padding: "28px 34px",
          fontSize: 36,
          fontWeight: 900,
        }}
      >
        Full dossier — link in bio
      </div>
      <div style={{ fontSize: 26, color: "#8A94A6", marginTop: 18 }}>Follow for every mainboard IPO, decoded.</div>
    </Frame>
  );
}

export const IPO_SLIDES = [CoverSlide, DemandSlide, MoneySlide, VerdictSlide, ActionSlide];

/* ---------------- Evergreen templates ---------------- */

export type Evergreen = {
  id: string;
  level: "beginner" | "expert";
  pillar: string;
  cover: string;
  sub: string;
  points: string[];
  cta: string;
};

export function EvergreenCover({ post, n, of }: { post: Evergreen; n: number; of: number }) {
  return (
    <Frame foot={`SLIDE ${n}/${of} · ${post.pillar.toUpperCase()} · ${post.level.toUpperCase()}`}>
      <div style={{ display: "flex", background: "#D4FF4F", color: "#080A0F", borderRadius: 999, padding: "10px 26px", fontSize: 28, fontWeight: 800, alignSelf: "flex-start" }}>
        {post.pillar}
      </div>
      <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05, marginTop: 24 }}>{post.cover}</div>
      <div style={{ fontSize: 36, color: "#8A94A6", marginTop: 20 }}>{post.sub}</div>
      <div style={{ fontSize: 34, marginTop: 36, color: "#D4FF4F", fontWeight: 700 }}>Swipe →</div>
    </Frame>
  );
}

export function EvergreenBody({ post, n, of }: { post: Evergreen; n: number; of: number }) {
  return (
    <Frame foot={`SLIDE ${n}/${of} · SAVE THIS`}>
      <div style={{ fontSize: 60, fontWeight: 900 }}>Break it down</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
        {post.points.slice(0, 4).map((p, i) => (
          <div key={p} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 64,
                height: 64,
                borderRadius: 32,
                background: "rgba(212,255,79,0.15)",
                color: "#D4FF4F",
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              {String(i + 1)}
            </div>
            <div style={{ fontSize: 36, lineHeight: 1.3 }}>{p}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function EvergreenCta({ post, n, of }: { post: Evergreen; n: number; of: number }) {
  return (
    <Frame foot={`SLIDE ${n}/${of} · EDUCATION, NOT ADVICE`}>
      <div style={{ fontSize: 64, fontWeight: 900 }}>Your move</div>
      <div style={{ fontSize: 40, marginTop: 20, lineHeight: 1.35 }}>{post.cta}</div>
      <div
        style={{ marginTop: 44, background: "#D4FF4F", color: "#080A0F", borderRadius: 24, padding: "28px 34px", fontSize: 36, fontWeight: 900 }}
      >
        Follow for daily market sense
      </div>
      <div style={{ fontSize: 26, color: "#8A94A6", marginTop: 18 }}>New post every day · IPOs + investing basics</div>
    </Frame>
  );
}

export const EVERGREEN_SLIDES = [EvergreenCover, EvergreenBody, EvergreenCta];
