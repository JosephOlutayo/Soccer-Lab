import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { ClubProvider } from "@/components/club-provider";
import { TopNav } from "@/components/top-nav";

// Condensed for display, regular for body — same superfamily, so the pairing
// stays cohesive while the width contrast does the heavy lifting.
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gunners Lab — Football history, live data and simulation",
  description:
    "Historical archives, live match data and scenario simulation for Arsenal and Europe's top five leagues.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <ClubProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-chalk focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
          >
            Skip to main content
          </a>
          <TopNav />
          <main id="main" className="mx-auto max-w-[1400px] px-4 sm:px-6">
            {children}
          </main>
        </ClubProvider>
      </body>
    </html>
  );
}
