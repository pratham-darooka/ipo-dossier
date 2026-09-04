import { NextResponse } from "next/server";
import { getPostedIds, markPosted } from "@/lib/social/log";

export const dynamic = "force-dynamic";

// GET /api/social/log — posted IDs (gated by middleware).
export async function GET() {
  return NextResponse.json({ ok: true, posted: [...(await getPostedIds())] });
}

// POST /api/social/log { id, kind, ref, postedOn } — mark published (gated).
export async function POST(req: Request) {
  const { id, kind, ref, postedOn } = (await req.json().catch(() => ({}))) as {
    id?: string; kind?: string; ref?: string; postedOn?: string;
  };
  if (!id || !kind || !ref || !postedOn) return NextResponse.json({ ok: false, error: "id, kind, ref, postedOn required" }, { status: 400 });
  const saved = await markPosted(id, kind, ref, postedOn);
  return NextResponse.json({ ok: saved });
}
