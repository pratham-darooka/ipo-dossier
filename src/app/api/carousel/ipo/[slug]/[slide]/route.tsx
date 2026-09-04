import { ImageResponse } from "next/og";
import { findIpo } from "@/lib/ipos";
import { IPO_SLIDES, W, H } from "@/lib/social/slides";

export const runtime = "edge";

// GET /api/carousel/ipo/[slug]/[slide] — 1080x1350 PNG, slides 1..5
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; slide: string }> }) {
  const { slug, slide } = await params;
  const ipo = await findIpo(slug).catch(() => undefined);
  if (!ipo) return new Response("unknown ipo", { status: 404 });
  const n = Math.min(Math.max(parseInt(slide, 10) || 1, 1), IPO_SLIDES.length);
  const Slide = IPO_SLIDES[n - 1];
  return new ImageResponse(<Slide ipo={ipo} n={n} of={IPO_SLIDES.length} />, { width: W, height: H });
}
