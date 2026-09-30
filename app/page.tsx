import Link from "next/link";
import { AgeChips } from "@/components/AgeChips";
import { Hero } from "@/components/Hero";
import { JsonLd } from "@/components/JsonLd";
import { PosterCard, TitleGrid } from "@/components/PosterCard";
import { Rail } from "@/components/Rail";
import { SearchForm } from "@/components/SearchForm";
import { CATEGORIES, CATEGORY_LIST, SITE, siteUrl } from "@/lib/config";
import { fetchScreenScore } from "@/lib/bridge";
import { fetchLatest } from "@/lib/store";
import type { ScreenScore, Title } from "@/lib/types";

export const revalidate = 300;

const siteSearchAction = {
  "@type": "SearchAction",
  target: {
    "@type": "EntryPoint",
    urlTemplate: `${siteUrl("/search")}?q={search_term_string}`,
  },
  "query-input": "required name=search_term_string",
};

export default async function HomePage() {
  const [film, game, series, ebooks, apps] = await Promise.all([
    fetchLatest("film", 7),
    fetchLatest("game", 12),
    fetchLatest("series", 12),
    fetchLatest("e-books", 12),
    fetchLatest("aplikasi", 12),
  ]);

  const heroItems = film.slice(0, 7);
  const scores = await loadScores(heroItems);

  // Prefer a title with an editor score for the hero slot.
  const withScore = heroItems.find((t) => scores[t.slug]?.score != null);
  const featured = withScore ?? heroItems[0];
  const rest = heroItems.filter((t) => t.slug !== featured?.slug).slice(0, 6);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: SITE.name,
              url: siteUrl("/"),
              inLanguage: "id",
              potentialAction: siteSearchAction,
            },
            {
              "@type": "Organization",
              name: SITE.name,
              url: siteUrl("/"),
              description: SITE.tagline,
            },
          ],
        }}
      />
      {featured && (
        <Hero
          featured={featured}
          rest={rest}
          scores={scores}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* age-band entry — the kid-safety promise of the product */}
        <section className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6 ss-reveal" ss-reveal="">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold">Pilih sesuai usia anak</h2>
            <span className="text-sm text-muted">
              Setiap judul punya rating usia & poin keamanan
            </span>
          </div>
          <div className="mt-3">
            <AgeChips basePath="/films" />
          </div>
        </section>

        <Rail
          heading="Film Terbaru"
          blurb="Review film pilihan untuk keluarga"
          href={CATEGORIES.film.path}
          items={film.slice(0, 12)}
        />
        <Rail
          heading="Game & Aplikasi"
          blurb="Main dengan nilai positif"
          href={CATEGORIES.game.path}
          items={[...game.slice(0, 6), ...apps.slice(0, 6)]}
        />
        <Rail
          heading="Serial Terbaru"
          blurb="Episode yang aman ditonton bersama"
          href={CATEGORIES.series.path}
          items={series}
        />
        <Rail
          heading="E-Books"
          blurb="Tumbuhkan minat baca sejak dini"
          href={CATEGORIES["e-books"].path}
          items={ebooks}
        />

        {/* category doors */}
        <section className="mt-14 ss-reveal" ss-reveal="">
          <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">Jelajahi Semua</h2>
          <TitleGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORY_LIST.map((c) => (
              <Link
                key={c.slug}
                href={c.path}
                className="press group rounded-2xl border border-line bg-surface p-5 hover:border-pink"
              >
                <span className="text-2xl">
                  {c.slug === "film" ? "🎬" : c.slug === "series" ? "📺" : c.slug === "game" ? "🎮" : c.slug === "e-books" ? "📚" : "📱"}
                </span>
                <p className="mt-2 font-extrabold group-hover:text-pink">{c.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{c.blurb}</p>
              </Link>
            ))}
          </TitleGrid>
        </section>

        {/* search CTA */}
        <section className="mt-14 rounded-2xl bg-ink p-8 text-center text-white sm:p-10 ss-reveal" ss-reveal="">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Cari review tontonan favoritmu
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
            Ketik judul film, serial, game, atau e-book — kami tunjukkan skor
            keamanannya untuk anak.
          </p>
          <div className="mx-auto mt-5 max-w-lg">
            <SearchForm />
          </div>
        </section>

        {/* latest reviewed grid */}
        <section className="mt-14 ss-reveal" ss-reveal="">
          <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">
            Baru Ditambahkan
          </h2>
          <TitleGrid>
            {film.slice(0, 6).map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </TitleGrid>
        </section>
      </div>
    </>
  );
}

/** Editor scores for hero items only (bounded bridge fetches). */async function loadScores(items: Title[]): Promise<Record<string, ScreenScore | null>> {
  const entries = await Promise.all(
    items.slice(0, 7).map(async (t) => {
      try {
        return [t.slug, await fetchScreenScore(t.permalink)] as const;
      } catch {
        return [t.slug, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
