import type { ScreenScore, Title } from "@/lib/types";
import { sanitizeWpHtml } from "@/lib/utils";
import { RatingStars } from "./RatingStars";
import { ScoreNumber } from "./ScoreNumber";

/**
 * THE signature moment — IMDb's yellow rating box, kid-edition:
 * big editor score + 6-dimension safety breakdown + curated review.
 */
export function ScorePanel({
  score,
  title,
}: {
  score: ScreenScore | null;
  title: Title;
}) {
  const community = title.averageRating > 0;

  if (!score && !community) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white ss-reveal" ss-reveal="">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:p-6">
        {/* score box */}
        {score?.score != null && (
          <div className="flex shrink-0 flex-col items-center rounded-lg bg-yellow px-6 py-5 sm:w-40">
            <span className="text-4xl font-extrabold tabular text-ink">
              <ScoreNumber value={score.score} />
            </span>
            <span className="mt-1 text-xs font-bold uppercase tracking-wider text-ink/70">
              Screen Score
            </span>
            <span className="mt-2 text-lg tracking-tight text-ink" aria-hidden>
              {"★".repeat(score.stars)}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">
            {score?.label || "Screen Score Editor Review"}
          </h2>

          {community && (
            <div className="mt-1.5">
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

          {score?.review && (
            <p
              className="mt-3 text-sm leading-relaxed text-ink/85"
              dangerouslySetInnerHTML={{
                __html: sanitizeWpHtml(score.review, 4000),
              }}
            />
          )}
        </div>
      </div>

      {/* 6-dimension breakdown */}
      {score && score.dimensions.length > 0 && (
        <div className="grid gap-x-8 gap-y-3 border-t border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
          {score.dimensions.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold">{d.label}</span>
              {/* role="img": without it a plain span's aria-label is never
                  exposed to assistive tech, so the rating would be silent. */}
              <span role="img" aria-label={`${d.stars} dari 5`} className="flex items-center gap-0.5 text-sm">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < d.stars ? "text-yellow-600" : "text-line"}
                  >
                    ★
                  </span>
                ))}
                <span className="tabular ml-1.5 w-6 text-right text-xs font-bold text-muted">
                  {d.stars}/5
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


