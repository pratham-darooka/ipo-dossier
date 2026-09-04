import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const sans = Space_Grotesk({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "IPO Dossier — India's Mainboard IPO Intelligence",
  description:
    "Every mainboard IPO decoded: live subscription, GMP, DRHP forensics, valuation vs peers, and separate verdicts for listing-gain traders and long-term investors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${display.variable} ${sans.variable} ${mono.variable} min-h-full flex flex-col noise antialiased`}>
        <ThemeProvider>
          <SmoothScroll />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
