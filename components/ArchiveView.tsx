import { AgeChips } from "@/components/AgeChips";
import { JsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { PosterCard, TitleGrid } from "@/components/PosterCard";
import { SITE, siteUrl } from "@/lib/config";
import type { CategoryConfig } from "@/lib/config";
import { fetchTitles } from "@/lib/store";

/**
 * Shared archive layout for /films, /series, /e-books, /game, /aplikasi.
 * URL params mirror the legacy WP site: ?page=2&age=<product_tag>
 */
export async function ArchiveView({
  category,
  page,
  age,
}: {
  category: CategoryConfig;
  page: number;
  age?: string;
}) {
  // Let upstream failures reach the error boundary — swallowing them here
  // used to render "no titles yet" whenever WordPress blipped.
  const data = await fetchTitles({
    category: category.slug,
    page,
    perPage: 16,
    tag: age,
    orderby: "date",
    order: "desc",
  });

  /*
   * Structured data for the archive.
   *
   * These five category pages carry the site's main internal-linking hubs and
   * were emitting no JSON-LD at all. `ItemList` is the part that matters: it
   * turns the visible grid into a machine-readable ranked list of titles,
   * which is what both Google's rich results and AI answer engines read when
   * asked "what films are there for kids" — without it, the grid is only
   * pixels. `CollectionPage` types the page itself so the list has a parent.
   */
  const canonical = age ? category.path : page > 1 ? `${category.path}?page=${page}` : category.path;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: page > 1 ? `${category.name} — Halaman ${page}` : category.name,
            description: category.blurb,
            url: siteUrl(canonical),
            isPartOf: { "@type": "WebSite", name: SITE.name, url: siteUrl("/") },
            inLanguage: "id",
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: data.items.length,
              itemListOrder: "https://schema.org/ItemListOrderDescending",
              itemListElement: data.items.map((t, i) => ({
                "@type": "ListItem",
                position: (page - 1) * 16 + i + 1,
                name: t.name,
                url: siteUrl(`/content/${t.slug}`),
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl("/") },
              {
                "@type": "ListItem",
                position: 2,
                name: category.name,
                item: siteUrl(category.path),
              },
            ],
          },
        ]}
      />

      <div className="ss-container py-10">
      {/* suppressHydrationWarning: ScrollReveal sets data-ss-reveal before
          this streamed segment hydrates — React never renders that attribute,
          so there is nothing to patch up. */}
      <header className="mb-6 ss-reveal" ss-reveal="" suppressHydrationWarning>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">{category.blurb}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted tabular">
          {data.total} judul
        </p>
        <div className="mt-4">
          <AgeChips active={age} basePath={category.path} />
        </div>
      </header>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="text-muted">
            {age
              ? "Belum ada judul yang diberi label usia ini."
              : "Belum ada judul untuk filter ini."}
          </p>
          {age && (
            <a
              href={category.path}
              className="mt-3 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-bold text-pink-600 hover:underline"
            >
              Lihat semua {category.name} →
            </a>
          )}
        </div>
      ) : (
        <TitleGrid>
          {data.items.map((t) => (
            <PosterCard key={t.id} title={t} />
          ))}
        </TitleGrid>
      )}

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        basePath={category.path}
        query={age ? { age } : {}}
      />
      </div>
    </>
  );
}
