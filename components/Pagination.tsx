import Link from "next/link";
import { pageWindow } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  age,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  age?: string;
}) {
  if (totalPages <= 1) return null;
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (age) params.set("age", age);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const window = pageWindow(page, totalPages);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Paginasi">
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-lg border border-line px-3 py-2 text-sm font-bold hover:border-ink"
        >
          ← Prev
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
              ? "rounded-lg bg-ink px-3.5 py-2 text-sm font-bold text-white"
              : "rounded-lg border border-line px-3 py-2 text-sm font-bold hover:border-ink"
          }
        >
          {p}
        </Link>
      ))}
      {page < totalPages - 1 && <span className="px-1 text-muted">…</span>}
      {page < totalPages && (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-lg border border-line px-3 py-2 text-sm font-bold hover:border-ink"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
