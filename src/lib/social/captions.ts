import type { IpoSeed } from "../data";
import type { Evergreen } from "./slides";

const TAGS_IPO = [
  ["#IPO", "#IPOIndia", "#NSE", "#BSE", "#StockMarketIndia", "#Investing", "#ListingGains", "#PersonalFinanceIndia"],
  ["#IPOWatch", "#IndianStockMarket", "#NSEIndia", "#DalalStreet", "#IPOAlert", "#InvestIndia", "#ShareMarket", "#FinanceTips"],
  ["#MainboardIPO", "#IPOListing", "#StockMarketNews", "#InvestmentTips", "#WealthCreation", "#Nifty", "#Sensex", "#MoneyMatters"],
];
const TAGS_LEARN = [
  ["#Investing", "#PersonalFinanceIndia", "#StockMarketIndia", "#FinancialLiteracy", "#MoneyTips", "#InvestSmart"],
  ["#Finance101", "#MoneyMindset", "#WealthBuilding", "#IndianInvestor", "#LearnInvesting", "#SmartMoney"],
  ["#PersonalFinance", "#InvestmentEducation", "#StockMarketBasics", "#FinancialFreedom", "#MoneyHabits", "#GrowMoney"],
];

/** Rotate tag sets by post id hash — identical blocks every post throttles reach. */
function tagSet(sets: string[][], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return sets[Math.abs(h) % sets.length].join(" ");
}

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
    tagSet(TAGS_IPO, ipo.slug),
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
    tagSet(TAGS_LEARN, post.id),
  ].join("\n");
}
