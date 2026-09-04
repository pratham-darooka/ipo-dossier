import { fmtDate } from "./utils";
import { minInvestment, type IpoSeed } from "./data";

export const SITE_URL = "https://ipo-dossier.vercel.app";
export const SITE_NAME = "IPO Dossier";

/** Single source for visible FAQs AND FAQPage schema (no drift). */
export function ipoFaqs(ipo: IpoSeed, l: number, lt: number, growth: number, margin: number, hasFin: boolean): [string, string][] {
  return [
    [
      `Should I apply for the ${ipo.company} IPO for listing gains?`,
      l >= 7
        ? `Momentum supports it: QIB ${ipo.subscription.qib}x, total ${ipo.subscription.total}x${ipo.gmp.pct ? `, GMP +${ipo.gmp.pct}%` : ""}. Consider one lot and booking half on a pop.`
        : l >= 5 ? `Only if Day-2 QIB crosses 5x — otherwise the listing setup is weak.` : `No — demand and sentiment both argue against a listing bet.`,
    ],
    [
      `Is ${ipo.company} good for the long term?`,
      hasFin
        ? lt >= 7 ? `The business screens well: ${growth}% revenue CAGR, ${margin}% margins, cash-backed profits. Worth a deeper look.` : `Not yet — wait for cheaper re-entry or cleaner quarters.`
        : `The filing dossier is still building; don't size a long-term bet until financials land here.`,
    ],
    [
      `What is the ${ipo.company} IPO price band and lot size?`,
      ipo.priceMax
        ? `₹${ipo.priceMin}–₹${ipo.priceMax}${ipo.lotSize ? `, lot of ${ipo.lotSize} shares (min ₹${minInvestment(ipo).toLocaleString("en-IN")})` : ""}. Open ${fmtDate(ipo.openDate)} to ${fmtDate(ipo.closeDate)}.`
        : `Price band not announced yet — this page updates from NSE the hour it drops.`,
    ],
    [
      `When is the ${ipo.company} listing date?`,
      ipo.listingPrice != null
        ? `It listed at ₹${ipo.listingPrice} (${ipo.listingGainPct}%).`
        : ipo.listingDate ? `Tentatively ${fmtDate(ipo.listingDate)} (T+3 after close).` : `Around 3 working days after allotment — the calendar above tracks it live.`,
    ],
  ];
}

export function faqJsonLd(faqs: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function ipoJsonLd(ipo: IpoSeed, faqs: [string, string][]) {
  const url = `${SITE_URL}/ipo/${ipo.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `${ipo.company} IPO: dates, price band, GMP, subscription and verdict`,
        description: `Live NSE demand, price band ₹${ipo.priceMin}–₹${ipo.priceMax}, and separate verdicts for listing traders and long-term investors.`,
        datePublished: ipo.openDate || undefined,
        dateModified: ipo.syncedAt || undefined,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      },
      { ...faqJsonLd(faqs), "@id": `${url}#faq` },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: ipo.company, item: url },
        ],
      },
    ],
  };
}

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#org`,
        name: SITE_NAME,
        url: SITE_URL,
        description: "India's mainboard IPO intelligence: live NSE demand, GMP sentiment, DRHP forensics, valuation vs peers.",
      },
      { "@type": "WebSite", "@id": `${SITE_URL}#site`, url: SITE_URL, name: SITE_NAME, publisher: { "@id": `${SITE_URL}#org` } },
    ],
  };
}
