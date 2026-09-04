import type { Metadata } from "next";
import { getAllIpos } from "@/lib/ipos";
import { EVERGREEN } from "@/lib/social/evergreen";
import { buildSchedule } from "@/lib/social/schedule";
import { getPostedIds, listDrafts } from "@/lib/social/log";
import type { Evergreen } from "@/lib/social/slides";
import { StudioClient } from "@/components/studio-client";
import { Reveal } from "@/components/reveal";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Content studio",
  description: "Internal posting workflow: scheduled carousels, ZIP bundles, captions.",
  alternates: { canonical: `${SITE_URL}/studio` },
  robots: { index: false, follow: false },
};

export default async function StudioPage() {
  const [all, draftsRaw, posted] = await Promise.all([getAllIpos(), listDrafts(), getPostedIds()]);
  const drafts: Evergreen[] = draftsRaw
    .map((d) => d.payload as unknown as Evergreen)
    .filter((d) => d?.cover);
  const queue = buildSchedule({ ipos: all, bank: EVERGREEN, drafts, posted });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12">
      <Reveal>
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">CONTENT STUDIO · INTERNAL · 1 POST/DAY · 8PM IST · IPO AT T-2</div>
        <h1 className="font-display mt-3 text-5xl md:text-6xl font-black">Posting queue</h1>
        <p className="mt-4 max-w-2xl opacity-70">
          IPO opens → carousel goes out 2 days prior. Gaps fill with fresh tape, drafts, then unposted evergreen — never a repeat without a RECYCLE flag.
          ZIP bundles slides + caption. Mark posted to sync the log across the team.
        </p>
      </Reveal>
      <div className="mt-8">
        <StudioClient queue={queue} draftsCount={drafts.length} />
      </div>
    </div>
  );
}
