import type { MetadataRoute } from "next";
import { getAllIpos } from "@/lib/ipos";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ipos = await getAllIpos().catch(() => []);
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/calendar`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/brief`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/performance`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];
  for (const ipo of ipos) {
    pages.push({
      url: `${SITE_URL}/ipo/${ipo.slug}`,
      lastModified: ipo.syncedAt ? new Date(ipo.syncedAt) : new Date(),
      changeFrequency: ipo.status === "live" ? "hourly" : "daily",
      priority: ipo.status === "live" ? 0.9 : 0.7,
    });
  }
  return pages;
}
