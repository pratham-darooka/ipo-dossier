import Link from "next/link";
import type { Metadata } from "next";
import { getAllIpos } from "@/lib/ipos";
import { ipoScores } from "@/lib/social/slides";
import { EVERGREEN } from "@/lib/social/evergreen";
import { ipoCaption, evergreenCaption } from "@/lib/social/captions";
import { CopyBtn } from "@/components/copy-btn";
import { Reveal } from "@/components/reveal";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Content studio: IPO carousels + daily finance posts",
  description: "Download Instagram-ready carousel art per IPO plus evergreen investing content. Internal posting workflow.",
  alternates: { canonical: `${SITE_URL}/studio` },
  robots: { index: false, follow: false },
};

function SlideImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-auto" loading="lazy" />
      <div className="flex items-center justify-between p-2">
        <span className="font-mono2 text-[11px] opacity-60">{alt}</span>
        <a href={src} download className="font-mono2 text-[11px] font-bold underline decoration-[#D4FF4F] underline-offset-4">
          PNG ↓
        </a>
      </div>
    </div>
  );
}

export default async function StudioPage() {
  const all = await getAllIpos();
  const rank = (s: string) => (s === "live" ? 0 : s === "upcoming" ? 1 : 2);
  const ipos = [...all].sort((a, b) => rank(a.status) - rank(b.status)).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">CONTENT STUDIO · POSTING WORKFLOW</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Today{"'"}s posts</h1>
        <p className="mt-4 max-w-2xl opacity-70">
          Rule: IPO open or listing today → post its carousel. Else → post one evergreen.
          Download PNGs, copy caption, post in the Instagram app. Auto-posting unlocks after Meta approval (see guide below).
        </p>
      </Reveal>

      {ipos.map((ipo) => {
        const { l, lt, vl, vlt } = ipoScores(ipo);
        const caption = ipoCaption(ipo, l.score, lt.score, vl, vlt);
        return (
          <section key={ipo.slug} className="mt-10 rounded-[2rem] border border-white/10 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-black">{ipo.company}</h2>
              <span className="font-mono2 text-[11px] rounded-full bg-white/10 px-2.5 py-1">{ipo.status.toUpperCase()} · 5 SLIDES</span>
              <span className="ml-auto flex gap-2">
                <CopyBtn text={caption} label="Copy caption" />
                <Link href={`/ipo/${ipo.slug}`} className="inline-flex items-center rounded-full bg-white text-black dark:bg-[#D4FF4F] px-4 py-2 text-sm font-bold">
                  Dossier →
                </Link>
              </span>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-black/40 dark:bg-black/60 bg-black/5 p-4 font-mono2 text-xs opacity-80">{caption}</pre>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <SlideImg key={n} src={`/api/carousel/ipo/${ipo.slug}/${n}`} alt={`${ipo.slug} slide ${n}`} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-10">
        <h2 className="font-display text-4xl font-black">Evergreen bank</h2>
        <p className="mt-2 opacity-60">One per non-IPO day. Beginner ↔ expert rotation keeps both audiences warm.</p>
        <div className="mt-6 space-y-8">
          {EVERGREEN.map((post) => (
            <div key={post.id} className="rounded-[2rem] border border-white/10 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl font-black">{post.cover}</h3>
                <span className="font-mono2 text-[11px] rounded-full bg-white/10 px-2.5 py-1">{post.pillar.toUpperCase()} · {post.level.toUpperCase()} · 3 SLIDES</span>
                <span className="ml-auto"><CopyBtn text={evergreenCaption(post)} label="Copy caption" /></span>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
                {[1, 2, 3].map((n) => (
                  <SlideImg key={n} src={`/api/carousel/evergreen/${post.id}/${n}`} alt={`${post.id} slide ${n}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-dashed border-white/20 p-6 md:p-8">
        <h2 className="font-display text-2xl font-black">Auto-posting (phase 2)</h2>
        <p className="mt-2 text-sm opacity-70 max-w-3xl">
          Manual posting works today. For one-tap publishing: convert the IG account to Business/Creator, link a Facebook Page,
          create a Meta App with <b>instagram_content_publish</b>, and set <b>IG_USER_ID</b> + <b>IG_ACCESS_TOKEN</b> + <b>FB_PAGE_ID</b> on Vercel.
          Then <b>POST /api/social/publish</b> with <b>{"{ kind: 'ipo'|'evergreen', ref, slides: n }"}</b> uploads the carousel PNGs and publishes.
        </p>
      </section>
    </div>
  );
}
