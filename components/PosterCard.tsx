import Image from "next/image";
import Link from "next/link";
import type { TitleCard } from "@/lib/types";
import { RatingStars } from "./RatingStars";
import { cx } from "@/lib/utils";

/**
 * Portrait poster card — the atom of every grid and rail.
 * Shows age chip + category + community rating; optional editor score chip.
 *
 * `width` is only for fixed-width rails. In the responsive grid it must be
 * omitted so the card can fill its column — and `sizes` has to describe the
 * real layout, otherwise the browser downloads a 168px srcset slot for a
 * 400px column (or vice versa).
 */
const GRID_SIZES =
  "(min-width: 1024px) 16.6vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

export function PosterCard({
  title,
  score,
  width,
  priority = false,
  eager = false,
}: {
  title: TitleCard;
  score?: number | null;
  /** Fixed pixel width for horizontal rails; omit inside a grid. */
  width?: number;
  /**
   * Eager-load with a preload hint — reserved for the one card that sits
   * first in the head carousel and can become the page's LCP.
   */
  priority?: boolean;
  /**
   * Eager-load without the preload hint (Lighthouse's LCP discovery audit
   * fails on any `loading="lazy"` LCP candidate, and in a carousel that can
   * be *any* of the initially-visible slides — not just the first).
   */
  eager?: boolean;
}) {
  const poster = title.images[0];
  const category = title.categories[0]?.name;
  const age = title.ageRating;

  return (
    <Link
      href={`/content/${title.slug}`}
      className="poster-card group block w-full"
      style={width ? { width } : undefined}
    >
      <div
        className="relative overflow-hidden rounded-lg bg-surface"
        style={{ aspectRatio: "2 / 3" }}
      >
        {poster ? (
          <Image
            src={poster.src}
            alt={poster.alt || title.name}
            fill
            priority={priority}
            loading={eager && !priority ? "eager" : undefined}
            sizes={width ? `${width}px` : GRID_SIZES}
            quality={70}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs font-semibold text-muted">
            {title.name}
          </div>
        )}

        {age && (
          /* pink-600 rather than pink: white on #f2187c is 4.04:1, which
             fails AA for the 11px label carried by every poster card. */
          <span className="absolute left-1.5 top-1.5 rounded-full bg-pink-600 px-2 py-0.5 text-[11px] font-bold text-white">
            {age}
          </span>
        )}

        {typeof score === "number" && score > 0 && (
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-yellow px-1.5 py-0.5 text-[11px] font-extrabold text-ink tabular">
            {score.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-2">
        <p className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-pink-600">
          {title.name}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
            {category}
            {title.year ? ` · ${title.year}` : ""}
          </span>
          {title.averageRating > 0 && (
            <RatingStars value={title.averageRating} count={title.reviewCount} />
          )}
        </div>
      </div>
    </Link>
  );
}

/** Grid wrapper with consistent gutters. */
export function TitleGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ss-stagger",
        className,
      )}
    >
      {children}
    </div>
  );
}
