import Image from "next/image";
import Link from "next/link";
import type { ScreenScore, Title } from "@/lib/types";

/**
 * Home hero: one big featured title with backdrop, score chip and CTA —
 * followed by a strip of the next picks (all server-rendered, zero JS).
 */
export function Hero({
  featured,
  rest,
  scores,
}: {
  featured: Title;
  rest: Title[];
  scores: Record<string, ScreenScore | null>;
}) {
  const backdrop =
    featured.images[1]?.src ?? featured.images[0]?.src ?? "";
  const score = scores[featured.slug]?.score ?? null;

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute inset-0">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={70}
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className="rounded bg-pink px-2 py-1 text-white">Pilihan Editor</span>
            {featured.categories[0] && (
              <span className="rounded bg-white/15 px-2 py-1">
                {featured.categories[0].name}
              </span>
            )}
            {featured.ageRating && (
              <span className="rounded bg-yellow px-2 py-1 text-ink">
                {featured.ageRating}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            {featured.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            {featured.year && <span className="font-semibold text-white/70">{featured.year}</span>}
            {score != null && (
              <span className="flex items-center gap-1.5 rounded bg-yellow px-2.5 py-1 font-extrabold tabular text-ink">
                {score.toFixed(1)} <span aria-hidden>★</span>
              </span>
            )}
            {featured.averageRating > 0 && (
              <span className="font-semibold text-white/80">
                ★ {featured.averageRating.toFixed(1)} dari {featured.reviewCount} review
              </span>
            )}
          </div>

          {featured.excerpt && (
            <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              {featured.excerpt}
            </p>
          )}

          <Link
            href={`/content/${featured.slug}`}
            className="press mt-6 inline-flex rounded-full bg-pink px-6 py-3 text-sm font-extrabold text-white hover:bg-pink-600"
          >
            Lihat Review Lengkap
          </Link>
        </div>

        {rest.length > 0 && (
          <div className="rail mt-10">
            {rest.map((t) => (
              <Link
                key={t.id}
                href={`/content/${t.slug}`}
                className="group w-[120px]"
              >
                <div
                  className="relative overflow-hidden rounded-lg bg-white/10"
                  style={{ aspectRatio: "2 / 3" }}
                >
                  {t.images[0] && (
                    <Image
                      src={t.images[0].src}
                      alt={t.name}
                      fill
                      sizes="120px"
                      quality={70}
                      className="object-cover transition group-hover:scale-105"
                    />
                  )}
                  {t.ageRating && (
                    <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 py-0.5 text-[10px] font-bold">
                      {t.ageRating}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-bold text-white/85 group-hover:text-yellow">
                  {t.name}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
