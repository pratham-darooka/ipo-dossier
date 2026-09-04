import type { IpoSeed } from "../data";
import type { Evergreen } from "./slides";

const TAGS_IPO = ["#IPO", "#IPOIndia", "#NSE", "#BSE", "#StockMarketIndia", "#Investing", "#ListingGains", "#PersonalFinanceIndia"];
const TAGS_LEARN = ["#Investing", "#PersonalFinanceIndia", "#StockMarketIndia", "#FinancialLiteracy", "#MoneyTips", "#InvestSmart"];

/** Copy-paste Instagram caption for an IPO carousel. */
export function ipoCaption(ipo: IpoSeed, listingScore: number, longScore: number, verdictL: string, verdictLT: string): string {
  const lines = [
    `${ipo.company} IPO — decoded in 5 slides.`,
    ``,
    ipo.priceMax > 0 ? `Band: ₹${ipo.priceMin}–₹${ipo.priceMax}${ipo.lotSize ? ` | Lot: ${ipo.lotSize}` : ""}` : `Price band awaited.`,
    ipo.subscription.total > 0 ? `Demand: ${ipo.subscription.total}x (QIB ${ipo.subscription.qib}x)` : `Opens ${ipo.openDate ? ipo.openDate.slice(0, 10) : "soon"} — demand tape goes live Day 1.`,
    `Our scores — Listing: ${listingScore.toFixed(1)}/10 (${verdictL}) | Long-term: ${longScore.toFixed(1)}/10 (${verdictLT})`,
    ``,
    `Full dossier — link in bio.`,
    ``,
    `Educational only, not investment advice.`,
    ``,
    TAGS_IPO.join(" "),
  ];
  return lines.join("\n");
}

/** Copy-paste caption for an evergreen post. */
export function evergreenCaption(post: Evergreen): string {
  return [
    `${post.cover}.`,
    ``,
    `${post.sub}. Full breakdown in slides.`,
    ``,
    `Follow for daily market sense — IPOs + investing basics.`,
    ``,
    TAGS_LEARN.join(" "),
  ].join("\n");
}
