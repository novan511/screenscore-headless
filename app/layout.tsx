import type { Metadata } from "next";
import Script from "next/script";
import { Jost } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ADSENSE, SITE, SITE_URL, WP_SITE } from "@/lib/config";

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
          Warm up the two origins the page reaches for right after first
          paint: the WordPress CDN (the washed-out band photo on the
          homepage) and YouTube's thumbnail host behind the video facade.
          React hoists these into <head>.
        */}
        <link rel="preconnect" href={WP_SITE} />
        <link rel="dns-prefetch" href={WP_SITE} />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="" />
        {/*
          AdSense loader — present on every page of the legacy site, which is
          what lets Auto Ads place units outside the explicit slots.
          `lazyOnload`: it waits for the window `load` event, so the
          220KB of adsbygoogle + show_ads_impl JS never competes with
          rendering, hydration or the LCP image (it was the largest remaining
          main-thread cost in the PageSpeed report).
        */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`}
          strategy="lazyOnload"
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
