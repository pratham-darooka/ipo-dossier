import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { siteJsonLd } from "@/lib/seo";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const sans = Space_Grotesk({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ipo-dossier.vercel.app"),
  title: {
    default: "IPO Dossier — India's Mainboard IPO Intelligence",
    template: "%s — IPO Dossier",
  },
  description:
    "Every mainboard IPO decoded: live NSE subscription, GMP, DRHP forensics, valuation vs peers, and separate verdicts for listing-gain traders and long-term investors.",
  alternates: { canonical: "https://ipo-dossier.vercel.app" },
  openGraph: { siteName: "IPO Dossier", type: "website", locale: "en_IN" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${display.variable} ${sans.variable} ${mono.variable} min-h-full flex flex-col noise antialiased`}>
        <ThemeProvider>
          <JsonLd data={siteJsonLd()} />
          <SmoothScroll />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
