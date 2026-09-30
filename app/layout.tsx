import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE, SITE_URL } from "@/lib/config";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
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
      <body className={`${jakarta.variable} flex min-h-screen flex-col`}>
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
