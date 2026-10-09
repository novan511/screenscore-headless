import Link from "next/link";
import type { BlogPost } from "@/lib/blog";
import { cx } from "@/lib/utils";

/** Category → pastel patch + emoji (static classes for the compiler). */
const CAT_STYLE: Record<string, { badge: string; emoji: string }> = {
  tips: { badge: "bg-mint", emoji: "💡" },
  ulasan: { badge: "bg-sky", emoji: "⭐" },
  news: { badge: "bg-cream", emoji: "📰" },
};

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Typographic article card — posts carry no images, so colour, badge and
 * copy do the work. Used on the homepage strip and the /blog grid.
 */
export function ArticleCard({
  post,
  index = 0,
  showExcerpt = true,
}: {
  post: BlogPost;
  index?: number;
  showExcerpt?: boolean;
}) {
  const style =
    CAT_STYLE[post.category?.slug ?? ""] ?? { badge: "bg-blush", emoji: "📝" };
  const published = new Date(post.date);
  const fresh =
    Date.now() - published.getTime() < 1000 * 60 * 60 * 24 * 7;

  return (
    <Link
      href={post.path}
      className={cx(
        "press group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-sm hover:border-pink/40 hover:shadow-[0_16px_36px_-22px_rgb(242_24_124/0.45)]",
        index % 3 === 1 && "sm:translate-y-3",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cx(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink",
            style.badge,
          )}
        >
          <span aria-hidden>{style.emoji}</span>
          {post.category?.name ?? "Artikel"}
        </span>
        {fresh && (
          <span className="rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
            Baru
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-extrabold leading-snug text-ink transition-colors group-hover:text-pink-600 sm:text-lg">
        {post.title}
      </h3>

      {showExcerpt && post.excerpt && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {post.excerpt}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs font-semibold text-muted">
        <time dateTime={post.date}>{DATE_FMT.format(published)}</time>
        <span
          aria-hidden
          className="text-pink-600 opacity-0 transition group-hover:opacity-100"
        >
          Baca →
        </span>
      </div>
    </Link>
  );
}
