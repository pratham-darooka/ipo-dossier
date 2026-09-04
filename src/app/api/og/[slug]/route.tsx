import { ImageResponse } from "next/og";
import { findIpo } from "@/lib/ipos";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ipo = await findIpo(slug).catch(() => undefined);
  const name = ipo?.company ?? "IPO Dossier";
  const band = ipo?.priceMax ? `₹${ipo.priceMin}–₹${ipo.priceMax}` : "Mainboard IPO";
  const sub = ipo?.subscription.total ? `${ipo.subscription.total}x subscribed` : "NSE-tracked";
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: "#080A0F", color: "#F2F4F8", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 28, color: "#D4FF4F", letterSpacing: 4 }}>IPO DOSSIER · NSE BSE MAINBOARD</div>
        <div style={{ fontSize: 76, fontWeight: 900, marginTop: 16, lineHeight: 1.05 }}>{name}</div>
        <div style={{ display: "flex", gap: 24, marginTop: 28, fontSize: 34, color: "#8A94A6" }}>
          <span>{band}</span>
          <span>{sub}</span>
        </div>
        <div style={{ fontSize: 24, marginTop: 20, color: "#E8C15A" }}>Apply or avoid? Read the dossier.</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
