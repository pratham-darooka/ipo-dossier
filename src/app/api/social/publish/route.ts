import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/social/publish { kind: "ipo"|"evergreen", ref: slug|id, slides: n, caption: string }
// Phase 2: requires IG_USER_ID + IG_ACCESS_TOKEN (+ FB_PAGE_ID) on Vercel and a Meta App
// with instagram_content_publish approved. Until then: 501 with the manual path.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { kind, ref, slides, caption } = body as { kind?: string; ref?: string; slides?: number; caption?: string };
  if (!kind || !ref || !slides || !caption) {
    return NextResponse.json({ ok: false, error: "kind, ref, slides, caption required" }, { status: 400 });
  }
  const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: "auto-post not configured",
        manual: "Download PNGs from /studio, copy caption, post in the Instagram app.",
        setup: "Set IG_USER_ID + IG_ACCESS_TOKEN (Meta App, instagram_content_publish) on Vercel, then retry.",
      },
      { status: 501 }
    );
  }

  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://ipo-dossier.vercel.app";
  const api = "https://graph.facebook.com/v21.0";
  try {
    // 1. Upload each slide as a carousel child container
    const children: string[] = [];
    for (let n = 1; n <= slides; n++) {
      const img = `${base}/api/carousel/${kind}/${ref}/${n}`;
      const up = await fetch(`${api}/${IG_USER_ID}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: img, is_carousel_item: true, access_token: IG_ACCESS_TOKEN }),
      });
      const uj = (await up.json()) as { id?: string; error?: { message?: string } };
      if (!uj.id) return NextResponse.json({ ok: false, error: `slide ${n} upload failed: ${uj.error?.message ?? "unknown"}` }, { status: 502 });
      children.push(uj.id);
    }
    // 2. Create carousel container + publish
    const cc = await fetch(`${api}/${IG_USER_ID}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "CAROUSEL", children: children.join(","), caption, access_token: IG_ACCESS_TOKEN }),
    });
    const cj = (await cc.json()) as { id?: string; error?: { message?: string } };
    if (!cj.id) return NextResponse.json({ ok: false, error: `container failed: ${cj.error?.message ?? "unknown"}` }, { status: 502 });
    const pub = await fetch(`${api}/${IG_USER_ID}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: cj.id, access_token: IG_ACCESS_TOKEN }),
    });
    const pj = (await pub.json()) as { id?: string; error?: { message?: string } };
    if (!pj.id) return NextResponse.json({ ok: false, error: `publish failed: ${pj.error?.message ?? "unknown"}` }, { status: 502 });
    return NextResponse.json({ ok: true, mediaId: pj.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
}
