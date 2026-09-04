import { getAllIpos } from "@/lib/ipos";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const revalidate = 86400;

export async function GET() {
  const ipos = await getAllIpos().catch(() => []);
  const live = ipos.filter((i) => i.status === "live");
  const upcoming = ipos.filter((i) => i.status === "upcoming");
  const listed = ipos.filter((i) => i.status === "listed");
  const lines = [
    `# ${SITE_NAME}`,
    `> India's mainboard IPO intelligence: live NSE demand, GMP sentiment, DRHP forensics, valuation vs peers.`,
    ``,
    `- [IPO calendar](${SITE_URL}/calendar): open/close/allotment/listing dates for every mainboard IPO`,
    `- [Morning brief](${SITE_URL}/brief): daily pre-open snapshot — live demand, GMP movers, opening soon`,
    `- [GMP truth ledger](${SITE_URL}/performance): grey-market predictions vs actual listing gains`,
    ``,
    ...(live.length ? ["## Live now", ...live.map((i) => `- [${i.company} IPO dossier](${SITE_URL}/ipo/${i.slug}): band ₹${i.priceMin}–₹${i.priceMax}, subscribed ${i.subscription.total || "—"}x`)] : []),
    ...(upcoming.length ? ["", "## Opening soon", ...upcoming.map((i) => `- [${i.company} IPO dossier](${SITE_URL}/ipo/${i.slug}): ${i.openDate ? `opens ${i.openDate.slice(0, 10)}` : "dates awaited"}`)] : []),
    ...(listed.length ? ["", "## Recently listed", ...listed.slice(0, 10).map((i) => `- [${i.company} IPO outcome](${SITE_URL}/ipo/${i.slug}): listed ${i.listingPrice ? `at ₹${i.listingPrice} (${i.listingGainPct}%)` : "recently"}`)] : []),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
