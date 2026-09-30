import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Rail } from "@/components/Rail";
import { ScorePanel } from "@/components/ScorePanel";
import { fetchScreenScore } from "@/lib/bridge";
import { CATEGORIES } from "@/lib/config";
import { fetchRelated, fetchTitleBySlug, fetchTitleSeo } from "@/lib/store";
import { sanitizeWpHtml } from "@/lib/utils";

export const revalidate = 300;
export const dynamicParams = true;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const seo = await fetchTitleSeo(slug);
  if (seo) {
    return {
      title: seo.title,
      description: seo.description,
      openGraph: {
        title: seo.title,
        description: seo.description,
        images: seo.image ? [{ url: seo.image }] : undefined,
      },
    };
  }
  const title = await fetchTitleBySlug(slug);
  if (!title) return { title: "Judul tidak ditemukan" };
  return {
    title: title.name,
    description: title.excerpt ?? undefined,
  };
}

export default async function TitlePage({ params }: Props) {
  const { slug } = await params;
  const title = await fetchTitleBySlug(slug);
  if (!title) notFound();

  const [score, related] = await Promise.all([
    fetchScreenScore(title.permalink).catch(() => null),
    fetchRelated(title.categories[0]?.slug ?? "film", title.slug, 8).catch(
      () => [],
    ),
  ]);

  const category = title.categories[0];
  const poster = title.images[0];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* breadcrumb */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
        <Link href="/" className="hover:text-pink">Beranda</Link>
        <span>/</span>
        {category && (
          <>
            <Link
              href={
                category.slug === "film" ? "/films"
                  : category.slug === "series" ? "/series"
                    : category.slug === "e-books" ? "/e-books"
                      : category.slug === "game" ? "/game"
                        : category.slug === "aplikasi" ? "/aplikasi"
                          : "/films"
              }
              className="hover:text-pink"
            >
              {category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink">{title.name}</span>
      </nav>

      {/* header band */}
      <div className="rounded-2xl bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div
            className="relative mx-auto w-44 shrink-0 overflow-hidden rounded-xl bg-line sm:mx-0 sm:w-52"
            style={{ aspectRatio: "2 / 3" }}
          >
            {poster && (
              <Image
                src={poster.src}
                alt={poster.alt || title.name}
                fill
                priority
                sizes="208px"
                className="object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {category && (
                <span className="rounded bg-ink px-2 py-1 uppercase tracking-wide text-white">
                  {category.name}
                </span>
              )}
              {title.year && (
                <span className="rounded bg-white px-2 py-1 text-ink">{title.year}</span>
              )}
              {title.ageRating && (
                <span className="rounded bg-yellow px-2 py-1 text-ink tabular">
                  {title.ageRating}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              {title.name}
            </h1>

            {title.excerpt && (
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink/80 sm:text-base">
                {title.excerpt}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted">
              {title.year && <span>Tahun {title.year}</span>}
              {title.reviewCount > 0 && (
                <span className="tabular">
                  ★ {title.averageRating.toFixed(1)} · {title.reviewCount} review orang tua
                </span>
              )}
              {title.tags.slice(0, 5).map((t) => (
                <span key={t.id} className="rounded-full bg-line px-2 py-0.5">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* signature score block */}
        <div className="mt-6">
          <ScorePanel score={score} title={title} />
        </div>
      </div>

      {/* synopsis */}
      {title.description && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-extrabold sm:text-2xl">
            Sinopsis Lengkap
          </h2>
          <div
            className="prose-headings:font-bold max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink/85 [&_b]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2"
            dangerouslySetInnerHTML={{
              __html: sanitizeWpHtml(title.description),
            }}
          />
        </section>
      )}

      {related.length > 0 && category && (
        <Rail
          heading="Mirip dengan ini"
          blurb={`Lebih banyak ${category.name} pilihan`}
          href={CATEGORIES[category.slug]?.path ?? "/films"}
          items={related}
        />
      )}
    </div>
  );
}
