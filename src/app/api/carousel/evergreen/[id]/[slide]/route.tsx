import { ImageResponse } from "next/og";
import { getEvergreen } from "@/lib/social/evergreen";
import { EVERGREEN_SLIDES, W, H } from "@/lib/social/slides";

export const runtime = "nodejs";

// GET /api/carousel/evergreen/[id]/[slide] — 1080x1350 PNG, slides 1..3
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; slide: string }> }) {
  const { id, slide } = await params;
  const post = getEvergreen(id);
  if (!post) return new Response("unknown post", { status: 404 });
  const n = Math.min(Math.max(parseInt(slide, 10) || 1, 1), EVERGREEN_SLIDES.length);
  const Slide = EVERGREEN_SLIDES[n - 1];
  return new ImageResponse(<Slide post={post} n={n} of={EVERGREEN_SLIDES.length} />, { width: W, height: H });
}
