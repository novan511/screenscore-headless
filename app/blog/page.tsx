import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { SITE, siteUrl } from "@/lib/config";
import { fetchBlogCategories, fetchPosts } from "@/lib/blog";
import { cx } from "@/lib/utils";

export const revalidate = 300;

const BLURB =
  "Tips, panduan, dan kabar digital pilihan dari redaksi ScreenScore — dibuat untuk orang tua yang ingin tontonan dan mainan anak lebih aman.";

interface Props {
  searchParams: Promise<{ page?: string; cat?: string }>;
}

const VALID_CATS = new Set(["semua", "news", "tips", "ulasan"]);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { cat, page: pageRaw } = await searchParams;
  const active = cat && VALID_CATS.has(cat) ? cat : "semua";
  const pageNum = Math.max(1, Number(pageRaw) || 1);

  // Paginated pages canonicalise to themselves — pointing page 2 at page 1
  // would declare all that content a duplicate.
  const params = new URLSearchParams();
  if (active !== "semua") params.set("cat", active);
  if (pageNum > 1) params.set("page", String(pageNum));
  const qs = params.toString();
  const canonical = qs ? `/blog?${qs}` : "/blog";

  return {
    title: "Artikel & Tips Digital untuk Orang Tua",
    description: BLURB,
    alternates: { canonical },
    openGraph: {
      title: `Artikel & Tips Digital untuk Orang Tua — ${SITE.name}`,
      description: BLURB,
      url: canonical,
      siteName: SITE.name,
      type: "website",
      locale: "id_ID",
    },
    twitter: {
      card: "summary",
      title: `Artikel & Tips Digital untuk Orang Tua — ${SITE.name}`,
      description: BLURB,
    },
  };
}

export default async function BlogPage({ searchParams }: Props) {
  const { page: pageRaw, cat: catRaw } = await searchParams;
  const cat = catRaw && VALID_CATS.has(catRaw) ? catRaw : "semua";
  const page = Math.max(1, Number(pageRaw) || 1);

  const [data, categories] = await Promise.all([
    fetchPosts({ page, perPage: 12, cat }),
    fetchBlogCategories(),
  ]);

  if (page > data.totalPages) notFound();

  const activeCat = categories.find((c) => c.slug === cat);
  const chips = [
    { slug: "semua", name: "Semua Artikel" },
    ...categories.filter((c) => c.slug !== "uncategorized"),
  ];

  const listUrl = (c: string) => (c === "semua" ? "/blog" : `/blog?cat=${c}`);

  return (
    <div className="ss-container py-10 sm:py-14">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl("/") },
              {
                "@type": "ListItem",
                position: 2,
                name: "Artikel",
                item: siteUrl("/blog"),
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: activeCat ? `Artikel ${activeCat.name}` : "Artikel ScreenScore",
            url: siteUrl(listUrl(cat)),
            description: BLURB,
            inLanguage: "id",
            isPartOf: {
              "@type": "WebSite",
              name: SITE.name,
              url: siteUrl("/"),
            },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: data.total,
              itemListElement: data.items.map((p, i) => ({
                "@type": "ListItem",
                position: page === 1 ? i + 1 : (page - 1) * 12 + i + 1,
                name: p.title,
                url: siteUrl(p.path),
              })),
            },
          },
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-sm font-semibold text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-pink-600">
              Beranda
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-ink" aria-current="page">
            Artikel
          </li>
        </ol>
      </nav>

      <header className="mt-4 max-w-2xl">
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
          📚 Artikel & Tips untuk Orang Tua
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {BLURB}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="navigation" aria-label="Kategori artikel">
        {chips.map((c) => (
          <Link
            key={c.slug}
            href={listUrl(c.slug)}
            className={cx(
              "rounded-full px-4 py-2 text-xs font-bold text-ink transition",
              c.slug === cat
                ? "bg-pink-600 text-white"
                : "bg-surface hover:bg-pink-600 hover:text-white",
            )}
            aria-current={c.slug === cat ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {data.items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-4xl" aria-hidden>
            📭
          </p>
          <p className="mt-3 font-bold text-ink">Belum ada artikel di kategori ini.</p>
          <Link href="/blog" className="mt-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-bold text-pink-600 hover:underline">
            Lihat semua artikel →
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {data.items.map((post, i) => (
              <ArticleCard key={post.id} post={post} index={i} showExcerpt />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            basePath="/blog"
            query={cat === "semua" ? {} : { cat }}
          />
        </>
      )}
    </div>
  );
}
