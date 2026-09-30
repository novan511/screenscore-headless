import Image from "next/image";
import Link from "next/link";
import type { Title } from "@/lib/types";
import { RatingStars } from "./RatingStars";
import { cx } from "@/lib/utils";

/**
 * Portrait poster card — the atom of every grid and rail.
 * Shows age chip + category + community rating; optional editor score chip.
 */
export function PosterCard({
  title,
  score,
  width = 168,
}: {
  title: Title;
  score?: number | null;
  width?: number;
}) {
  const poster = title.images[0];
  const category = title.categories[0]?.name;
  const age = title.ageRating;

  return (
    <Link
      href={`/content/${title.slug}`}
      className="poster-card group block w-full"
      style={{ width }}
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
            sizes={`${width}px`}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs font-semibold text-muted">
            {title.name}
          </div>
        )}

        {age && (
          <span className="absolute left-1.5 top-1.5 rounded bg-ink/85 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
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
        <p className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-pink">
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
        "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
