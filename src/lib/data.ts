// Seed + fallback dataset. Realistic mainboard IPOs (Aug/Sep 2026 window).
// Scrapers upsert into Neon; UI falls back to this when DB is empty / offline.

export type FinancialRow = { fy: string; revenueCr: number; patCr: number; roe: number; roce: number; de: number; cfoCr: number };
export type Peer = { name: string; pe: number; pb: number; roe: number };
export type IpoSeed = {
  slug: string; company: string; sector: string; status: "live" | "upcoming" | "listed" | "allotted";
  openDate: string; closeDate: string; allotmentDate?: string; listingDate?: string;
  priceMin: number; priceMax: number; lotSize: number; issueSizeCr: number;
  freshIssuePct: number; promoterPre: number; promoterPost: number;
  registrar: string; leadManagers: string[]; objectsOfIssue: string[];
  financials: FinancialRow[]; peers: Peer[];
  subscription: { qib: number; nii: number; retail: number; employee: number; total: number };
  gmp: { value: number; pct: number };
  anchorPct: number; risks: string[]; about: string;
  drhpUrl?: string; rhpUrl?: string;
};

export const IPOS: IpoSeed[] = [
  {
    slug: "tempsens-instruments",
    company: "Tempsens Instruments",
    sector: "Industrial · Sensors & Controls",
    status: "live",
    openDate: "2026-08-20", closeDate: "2026-08-24",
    allotmentDate: "2026-08-25", listingDate: "2026-08-27",
    priceMin: 285, priceMax: 300, lotSize: 50, issueSizeCr: 310,
    freshIssuePct: 72, promoterPre: 88, promoterPost: 68,
    registrar: "MUFG Intime", leadManagers: ["Motilal Oswal", "Nuvama"],
    objectsOfIssue: ["New sensor plant at Udaipur (₹142 Cr)", "Debt repayment (₹48 Cr)", "General corporate purposes"],
    financials: [
      { fy: "FY24", revenueCr: 412, patCr: 38, roe: 14.2, roce: 16.1, de: 0.6, cfoCr: 31 },
      { fy: "FY25", revenueCr: 538, patCr: 57, roe: 17.8, roce: 19.4, de: 0.5, cfoCr: 49 },
      { fy: "FY26", revenueCr: 692, patCr: 81, roe: 21.3, roce: 23.0, de: 0.3, cfoCr: 74 },
    ],
    peers: [
      { name: "Tempsens", pe: 28, pb: 4.1, roe: 21.3 },
      { name: "Honeywell Auto", pe: 62, pb: 9.8, roe: 16.0 },
      { name: "Transducers India", pe: 34, pb: 5.2, roe: 18.1 },
    ],
    subscription: { qib: 38.4, nii: 29.1, retail: 12.6, employee: 4.2, total: 21.7 },
    gmp: { value: 290, pct: 96.7 },
    anchorPct: 32,
    risks: ["38% revenue from top-5 clients", "Raw-material (semiconductor) price swings", "Udaipur plant execution delay risk"],
    about: "Udaipur-based maker of thermal sensors, thermocouples and calibration systems for steel, cement and pharma plants. Exports to 28 countries.",
  },
  {
    slug: "augmont-enterprises",
    company: "Augmont Enterprises",
    sector: "Fintech · Gold & Bullion",
    status: "live",
    openDate: "2026-08-21", closeDate: "2026-08-25",
    allotmentDate: "2026-08-26", listingDate: "2026-08-28",
    priceMin: 750, priceMax: 788, lotSize: 19, issueSizeCr: 1080,
    freshIssuePct: 35, promoterPre: 76, promoterPost: 61,
    registrar: "KFintech", leadManagers: ["ICICI Securities", "JM Financial"],
    objectsOfIssue: ["Tech + vault network (₹220 Cr)", "Working capital for bullion (₹180 Cr)", "OFS — partial promoter exit"],
    financials: [
      { fy: "FY24", revenueCr: 4210, patCr: 42, roe: 9.1, roce: 11.2, de: 1.8, cfoCr: -18 },
      { fy: "FY25", revenueCr: 5980, patCr: 71, roe: 12.4, roce: 13.8, de: 1.5, cfoCr: 22 },
      { fy: "FY26", revenueCr: 7840, patCr: 96, roe: 14.0, roce: 15.1, de: 1.3, cfoCr: 41 },
    ],
    peers: [
      { name: "Augmont", pe: 41, pb: 5.1, roe: 14.0 },
      { name: "Titan", pe: 68, pb: 12.4, roe: 22.0 },
      { name: "Kalyan Jewellers", pe: 38, pb: 6.0, roe: 15.2 },
    ],
    subscription: { qib: 4.8, nii: 6.2, retail: 5.1, employee: 2.0, total: 5.4 },
    gmp: { value: 310, pct: 39.3 },
    anchorPct: 28,
    risks: ["Thin 1.2% PAT margins — bullion is volume game", "Gold-price volatility hits working capital", "65% OFS — promoters cashing out big"],
    about: "Digital-gold + bullion supply platform powering jewellers and fintechs. Huge topline, wafer-thin margins — classic listing-pop candidate, weak compounder.",
  },
  {
    slug: "symbiotec-pharmalab",
    company: "Symbiotec Pharmalab",
    sector: "Pharma · APIs",
    status: "listed",
    openDate: "2026-08-24", closeDate: "2026-08-27",
    allotmentDate: "2026-08-28", listingDate: "2026-09-01",
    priceMin: 940, priceMax: 990, lotSize: 15, issueSizeCr: 820,
    freshIssuePct: 55, promoterPre: 82, promoterPost: 66,
    registrar: "MUFG Intime", leadManagers: ["Kotak", "Axis Capital"],
    objectsOfIssue: ["API expansion Indore (₹310 Cr)", "R&D + USFDA remediation (₹90 Cr)"],
    financials: [
      { fy: "FY24", revenueCr: 890, patCr: 112, roe: 16.4, roce: 18.2, de: 0.4, cfoCr: 98 },
      { fy: "FY25", revenueCr: 1042, patCr: 141, roe: 18.1, roce: 20.0, de: 0.3, cfoCr: 122 },
      { fy: "FY26", revenueCr: 1218, patCr: 178, roe: 19.6, roce: 21.4, de: 0.2, cfoCr: 160 },
    ],
    peers: [
      { name: "Symbiotec", pe: 31, pb: 5.0, roe: 19.6 },
      { name: "Divi's Labs", pe: 48, pb: 8.1, roe: 18.4 },
      { name: "Laurus Labs", pe: 36, pb: 5.4, roe: 14.2 },
    ],
    subscription: { qib: 22.1, nii: 14.3, retail: 8.9, employee: 3.1, total: 13.8 },
    gmp: { value: 185, pct: 18.7 },
    anchorPct: 35,
    risks: ["USFDA inspection pending at Indore unit", "Top-3 molecules = 54% revenue"],
    about: "Steroid + hormone API maker with strong cash conversion and clean balance sheet. Priced below Divi's — long-term compounder profile.",
  },
  {
    slug: "skyways-air-services",
    company: "Skyways Air Services",
    sector: "Logistics · Air Freight",
    status: "listed",
    openDate: "2026-08-24", closeDate: "2026-08-27",
    allotmentDate: "2026-08-28", listingDate: "2026-09-01",
    priceMin: 165, priceMax: 174, lotSize: 86, issueSizeCr: 583,
    freshIssuePct: 48, promoterPre: 79, promoterPost: 62,
    registrar: "Bigshare", leadManagers: ["Pantomath", "Unistone"],
    objectsOfIssue: ["Freighter fleet lease deposits", "Warehouse automation"],
    financials: [
      { fy: "FY24", revenueCr: 612, patCr: 28, roe: 11.2, roce: 13.0, de: 1.1, cfoCr: 12 },
      { fy: "FY25", revenueCr: 788, patCr: 44, roe: 14.8, roce: 16.2, de: 0.9, cfoCr: 30 },
      { fy: "FY26", revenueCr: 941, patCr: 61, roe: 17.2, roce: 18.8, de: 0.7, cfoCr: 52 },
    ],
    peers: [
      { name: "Skyways", pe: 26, pb: 3.8, roe: 17.2 },
      { name: "Blue Dart", pe: 44, pb: 7.2, roe: 19.0 },
      { name: "TCI Express", pe: 29, pb: 4.5, roe: 18.4 },
    ],
    subscription: { qib: 8.4, nii: 9.1, retail: 7.2, employee: 1.8, total: 8.1 },
    gmp: { value: 40, pct: 23.2 },
    anchorPct: 30,
    risks: ["Aviation-fuel + lease costs eat margins", "Listed -10% despite +23% GMP — GMP trap example"],
    about: "Asset-light air-freight forwarder. Listed at a discount to GMP — textbook case of why GMP ≠ listing price.",
  },
  {
    slug: "veegaland-developers",
    company: "Veegaland Developers",
    sector: "Realty · Kochi",
    status: "upcoming",
    openDate: "2026-09-10", closeDate: "2026-09-15",
    allotmentDate: "2026-09-16", listingDate: "2026-09-19",
    priceMin: 210, priceMax: 222, lotSize: 67, issueSizeCr: 450,
    freshIssuePct: 80, promoterPre: 91, promoterPost: 72,
    registrar: "KFintech", leadManagers: ["SBI Caps"],
    objectsOfIssue: ["Kochi + Bengaluru projects (₹320 Cr)", "Land acquisition"],
    financials: [
      { fy: "FY24", revenueCr: 288, patCr: 34, roe: 12.0, roce: 14.1, de: 0.9, cfoCr: 28 },
      { fy: "FY25", revenueCr: 356, patCr: 48, roe: 14.6, roce: 16.0, de: 0.8, cfoCr: 40 },
      { fy: "FY26", revenueCr: 442, patCr: 66, roe: 17.0, roce: 18.4, de: 0.6, cfoCr: 58 },
    ],
    peers: [
      { name: "Veegaland", pe: 24, pb: 2.8, roe: 17.0 },
      { name: "Prestige", pe: 32, pb: 3.6, roe: 12.4 },
      { name: "Sobha", pe: 38, pb: 4.1, roe: 10.8 },
    ],
    subscription: { qib: 0, nii: 0, retail: 0, employee: 0, total: 0 },
    gmp: { value: 25, pct: 11.3 },
    anchorPct: 0,
    risks: ["Kerala concentration 78%", "Realty cyclicality"],
    about: "Kochi premium-housing developer expanding to Bengaluru. 80% fresh issue actually builds inventory — rare honest realty IPO.",
  },
  {
    slug: "prasol-chemicals",
    company: "Prasol Chemicals",
    sector: "Specialty Chemicals",
    status: "upcoming",
    openDate: "2026-09-08", closeDate: "2026-09-10",
    allotmentDate: "2026-09-11", listingDate: "2026-09-15",
    priceMin: 318, priceMax: 335, lotSize: 44, issueSizeCr: 620,
    freshIssuePct: 60, promoterPre: 84, promoterPost: 67,
    registrar: "MUFG Intime", leadManagers: ["Nuvama", "DAM Capital"],
    objectsOfIssue: ["Dahej expansion (₹280 Cr)", "R&D centre"],
    financials: [
      { fy: "FY24", revenueCr: 720, patCr: 88, roe: 18.2, roce: 20.1, de: 0.5, cfoCr: 70 },
      { fy: "FY25", revenueCr: 845, patCr: 108, roe: 19.4, roce: 21.6, de: 0.4, cfoCr: 92 },
      { fy: "FY26", revenueCr: 992, patCr: 134, roe: 20.8, roce: 22.9, de: 0.3, cfoCr: 118 },
    ],
    peers: [
      { name: "Prasol", pe: 27, pb: 4.4, roe: 20.8 },
      { name: "Aarti Ind", pe: 34, pb: 4.9, roe: 14.6 },
      { name: "SRF", pe: 31, pb: 5.2, roe: 18.0 },
    ],
    subscription: { qib: 0, nii: 0, retail: 0, employee: 0, total: 0 },
    gmp: { value: 42, pct: 12.5 },
    anchorPct: 0,
    risks: ["China dumping in key intermediates", "Crude-linked RM volatility"],
    about: "Acetone-derivatives + pharma intermediates. Best ROE in this batch, priced below Aarti/SRF — deep-research favourite.",
  },
];

export function getIpo(slug: string) {
  return IPOS.find((i) => i.slug === slug);
}

export function minInvestment(ipo: IpoSeed) {
  return ipo.priceMax * ipo.lotSize;
}

export function expectedListing(ipo: IpoSeed) {
  return ipo.priceMax + ipo.gmp.value;
}
