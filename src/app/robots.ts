import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // Explicitly welcome answer-engine crawlers
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "CCBot", "Google-Extended", "Bytespider"],
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://ipo-dossier.vercel.app/sitemap.xml",
  };
}
