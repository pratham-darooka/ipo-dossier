import { ImageResponse } from "next/og";
import { getEvergreen } from "@/lib/social/evergreen";
import { generatedPosts } from "@/lib/social/generated";
import { listDrafts } from "@/lib/social/log";
import { getAllIpos } from "@/lib/ipos";
import { EvergreenCover, EvergreenBodyFor, EvergreenCta, W, H, type Evergreen } from "@/lib/social/slides";

export const runtime = "nodejs";

// GET /api/carousel/evergreen/[id]/[slide] — bank + generated + team drafts, 1080x1350.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; slide: string }> }) {
  const { id, slide } = await params;
  let post: Evergreen | undefined = getEvergreen(id);
  if (!post) {
    try {
      const ipos = await getAllIpos();
      post = generatedPosts(ipos).find((g) => g.id === id);
    } catch { /* ignore */ }
  }
  if (!post) {
    const drafts = await listDrafts();
    const d = drafts.find((x) => x.id === id)?.payload as unknown as Evergreen | undefined;
    if (d?.cover) post = { ...d } as Evergreen;
  }
  if (!post) return new Response("unknown post", { status: 404 });
  const n = Math.min(Math.max(parseInt(slide, 10) || 1, 1), 3);
  const Slide = n === 1 ? EvergreenCover : n === 2 ? EvergreenBodyFor(post) : EvergreenCta;
  return new ImageResponse(<Slide post={post} n={n} of={3} />, { width: W, height: H });
}
