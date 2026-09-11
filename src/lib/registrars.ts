/**
 * Registrar directory: every Indian IPO's allotment lives with one of these.
 * Nobody embeds the PAN check (registrars gate with CAPTCHA by design) — the winning
 * move is the right deep link + timing + document checklist, per IPO.
 */

export type Registrar = {
  key: string;
  name: string;
  aka?: string;
  url: string;
  accepts: string[];
  tip: string;
  share: "large" | "medium" | "small"; // rough mainboard footprint
};

export const REGISTRARS: Registrar[] = [
  {
    key: "mufg-intime",
    name: "MUFG Intime India",
    aka: "formerly Link Intime",
    url: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html",
    accepts: ["PAN", "Application No.", "DP / Client ID"],
    tip: "Handles the largest share of mainboard IPOs. Old linkintime.co.in bookmarks are dead — use this MUFG address. Select the company first (appears only after basis is finalised); PAN must be UPPERCASE.",
    share: "large",
  },
  {
    key: "kfintech",
    name: "KFin Technologies",
    aka: "KFintech",
    url: "https://ipostatus.kfintech.com/",
    accepts: ["Application No.", "Demat Account", "PAN"],
    tip: "Runs many of the largest issues. Results usually live by early evening on allotment day.",
    share: "large",
  },
  {
    key: "bigshare",
    name: "Bigshare Services",
    aka: "Bigshare",
    url: "https://ipo.bigshareonline.com/IPO_Status.html",
    accepts: ["Application No.", "Beneficiary ID", "PAN"],
    tip: "Pick Server 2 or 3 first — Server 1 chokes 6–8 PM on allotment day. Any server reads the same data.",
    share: "medium",
  },
  {
    key: "cameo",
    name: "Cameo Corporate Services",
    url: "https://ipo.cameoindia.com/",
    accepts: ["PAN", "Application No.", "DP ID"],
    tip: "Smaller registrar — appears mostly on SME issues and select mainboard ones.",
    share: "small",
  },
];

export const EXCHANGE_FALLBACKS = [
  {
    key: "bse",
    name: "BSE application status",
    url: "https://www.bseindia.com/investors/appli_check.aspx",
    tip: "Best fallback: PAN-based lookup across every issue in one place. Same underlying result as the registrar.",
  },
  {
    key: "nse",
    name: "NSE bid/allotment check",
    url: "https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids",
    tip: "Needs your application number (not PAN). Use it when you saved the UPI confirmation.",
  },
];

/** Match a dossier's registrar string to a directory entry (fuzzy, forgiving). */
export function matchRegistrar(registrar: string | undefined | null): Registrar | null {
  if (!registrar) return null;
  const r = registrar.toLowerCase();
  if (/mufg|link\s*intime|intime/.test(r)) return REGISTRARS[0];
  if (/kfin/.test(r)) return REGISTRARS[1];
  if (/bigshare/.test(r)) return REGISTRARS[2];
  if (/cameo/.test(r)) return REGISTRARS[3];
  if (/skyline/.test(r)) return { key: "skyline", name: "Skyline Financial Services", url: "https://www.skylinerta.com/", accepts: ["PAN", "Application No."], tip: "SME-heavy registrar.", share: "small" };
  if (/purva|purvaa/.test(r)) return { key: "purva", name: "Purva Sharegistry", url: "https://www.purvashare.com/", accepts: ["PAN", "Application No."], tip: "SME-heavy registrar.", share: "small" };
  if (/maashitla|mashitla/.test(r)) return { key: "maashitla", name: "Maashitla Securities", url: "https://maashitla.com/", accepts: ["PAN", "Application No."], tip: "SME-heavy registrar.", share: "small" };
  return null;
}
