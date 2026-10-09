import type { ScreenScore, Title } from "@/lib/types";
import { sanitizeArticleHtml } from "@/lib/utils";
import { RatingStars } from "./RatingStars";

/**
 * The reviewflow editor card the legacy page prints between the copy and
 * the gate: avatar chip, label + score, the review itself, then the
 * per-dimension star rows inside a ruled block.
 */
export function ScorePanel({
  score,
  title,
}: {
  score: ScreenScore | null;
  title: Title;
}) {
  if (!score) return null;

  const community = title.averageRating > 0;
  const label = score.label || "Screen Score Editor Review";

  return (
    <section
      className="ss-reveal rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6"
      ss-reveal=""
      /* ScrollReveal writes data-ss-reveal after SSR but before this
         streamed segment hydrates — tell React not to diff it. */
      suppressHydrationWarning
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f8ff00] text-base font-bold text-[#1a1a1a]"
        >
          {label.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-snug text-ink">
            {label}
          </p>
          {score.score != null && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <b className="tabular text-base font-bold text-ink">
                {score.score.toFixed(1)}
              </b>
              <span aria-hidden className="text-[#ffd400]">
                {"★".repeat(score.stars)}
              </span>
              <span aria-hidden className="text-line">
                {"★".repeat(Math.max(0, 5 - score.stars))}
              </span>
            </p>
          )}
        </div>
      </div>

      {score.review && (
        <div
          className="mt-4 text-base leading-[1.7] text-ink/85"
          dangerouslySetInnerHTML={{
            __html: sanitizeArticleHtml(score.review, 8000),
          }}
        />
      )}

      {community && (
        <div className="mt-4">
          <RatingStars
            value={title.averageRating}
            count={title.reviewCount}
            size="md"
          />
          <span className="ml-2 text-xs font-semibold text-muted">
            dari orang tua
          </span>
        </div>
      )}

      {/* 6-dimension breakdown — ruled block, label + stars per row */}
      {score.dimensions.length > 0 && (
        <div className="mt-4 space-y-2 border-y border-[#e0e0e0] py-3">
          {score.dimensions.map((d) => (
            <div
              key={d.label}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <span className="text-sm text-ink">{d.label}</span>
              {/* role="img": without it a plain span's aria-label is never
                  exposed to assistive tech, so the rating would be silent. */}
              <span
                role="img"
                aria-label={`${d.stars} dari 5`}
                className="flex text-sm"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < d.stars ? "text-[#ffd400]" : "text-line"}
                  >
                    ★
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
