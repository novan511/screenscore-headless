import { fetchMemberReviews } from "@/lib/reviews";

/**
 * Approved member reviews for a title — streamed in behind the writer like
 * the related rail, reading rf/v1 (our reviewflow REST snippet). Until the
 * snippet is installed the endpoint 404s and the empty state shows.
 */
export async function MemberReviews({
  postId,
  permalink,
}: {
  postId: number;
  permalink?: string;
}) {
  const reviews = await fetchMemberReviews(postId, permalink);

  if (!reviews || reviews.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface/70 p-6 text-center">
        <p className="text-sm font-extrabold text-ink">Belum ada review member</p>
        <p className="mt-1 text-sm text-muted">
          Jadilah yang pertama — login lalu tulis review kamu.
        </p>
      </div>
    );
  }

  const rated = reviews
    .map((r) => r.rating)
    .filter((r): r is number => r !== null);
  const average = rated.length
    ? rated.reduce((sum, r) => sum + r, 0) / rated.length
    : null;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-canvas px-5 py-4">
        {average !== null && (
          <span className="flex items-center gap-2">
            <b className="tabular text-2xl font-extrabold text-ink">
              {average.toFixed(1)}
            </b>
            <span aria-hidden className="text-lg text-yellow-600">
              {"★".repeat(Math.round(average))}
            </span>
          </span>
        )}
        <span className="tabular text-sm font-bold text-muted">
          {reviews.length} review member
        </span>
      </div>

      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
        >
          <header className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow text-sm font-extrabold text-ink"
            >
              {review.author.trim().charAt(0).toUpperCase() || "M"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink">
                {review.author}
              </p>
              <p className="tabular flex items-center gap-2 text-xs font-semibold text-muted">
                {formatDate(review.date)}
                {review.rating !== null && (
                  <span className="text-yellow-600">
                    ★ {review.rating.toFixed(1)}
                  </span>
                )}
              </p>
            </div>
          </header>

          {review.title && (
            <h3 className="mt-3.5 font-extrabold text-ink">{review.title}</h3>
          )}
          <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink/85">
            {review.content}
          </p>

          {review.dimensions.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-3.5">
              {review.dimensions.map((dim) => (
                <div key={dim.label} className="flex items-baseline gap-1.5">
                  <dt className="text-xs font-semibold text-muted">
                    {dim.label}
                  </dt>
                  <dd className="tabular text-xs font-extrabold text-ink">
                    {dim.stars}/5
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </article>
      ))}
    </div>
  );
}

/** Matches the Rail footprint so streaming in does not shift the page. */
export function ReviewsSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true">
      <div className="skeleton h-16 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return "";
  // WordPress renders "Juli 6, 2026" — V8 only parses English months, so map
  // Indonesian names first; anything unparseable falls back to the raw text.
  const parsed = parseIdDate(value) ?? new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ID_MONTHS: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

function parseIdDate(value: string): Date | null {
  const m = value.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = ID_MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Number(m[3]), month, Number(m[2]));
}
