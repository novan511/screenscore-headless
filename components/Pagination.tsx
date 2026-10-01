import Link from "next/link";
import { pageWindow } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  /** Extra query params preserved across pages (e.g. { age } or { cat }). */
  query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const window = pageWindow(page, totalPages);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginasi">
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-bold hover:border-ink"
        >
          ← Sebelumnya
        </Link>
      )}
      {page > 2 && <span className="px-1 text-muted">…</span>}
      {window.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-ink px-3.5 text-sm font-bold text-white"
              : "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3.5 text-sm font-bold hover:border-ink"
          }
        >
          {p}
        </Link>
      ))}
      {page < totalPages - 1 && <span className="px-1 text-muted">…</span>}
      {page < totalPages && (
        <Link
          href={hrefFor(page + 1)}
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-3.5 text-sm font-bold hover:border-ink"
        >
          Berikutnya →
        </Link>
      )}
    </nav>
  );
}
