import type { Metadata } from "next";
import Script from "next/script";
import { Jost } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ADSENSE, SITE, SITE_URL } from "@/lib/config";

/*
 * Jost is the typeface of the legacy Astra site (400 for copy, 500–700 for
 * headings) — keeping it makes the headless frontend read as the same brand
 * rather than as a redesign.
 */
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "ScreenScore: review, rating usia, dan kurasi konten film, serial, game, e-book, dan aplikasi terbaik untuk anak.",
  // Every page inherits a canonical unless it declares its own.
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "id_ID",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description:
      "Review, rating usia, dan kurasi konten film, serial, game, e-book, dan aplikasi terbaik untuk anak.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${jost.variable} flex min-h-screen flex-col`}>
        {/*
          AdSense loader — present on every page of the legacy site, which is
          what lets Auto Ads place units outside the explicit slots. Loaded
          after hydration so it never competes with the render-blocking path.
        */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <ScrollReveal />
        <SiteHeader />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
