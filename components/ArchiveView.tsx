import { AgeChips } from "@/components/AgeChips";
import { Pagination } from "@/components/Pagination";
import { PosterCard, TitleGrid } from "@/components/PosterCard";
import type { CategoryConfig } from "@/lib/config";
import { fetchTitles } from "@/lib/store";

/**
 * Shared archive layout for /films, /series, /e-books, /game, /aplikasi.
 * URL params mirror the legacy WP site: ?page=2&age=<product_tag>
 */
export async function ArchiveView({
  category,
  page,
  age,
}: {
  category: CategoryConfig;
  page: number;
  age?: string;
}) {
  // Let upstream failures reach the error boundary — swallowing them here
  // used to render "no titles yet" whenever WordPress blipped.
  const data = await fetchTitles({
    category: category.slug,
    page,
    perPage: 16,
    tag: age,
    orderby: "date",
    order: "desc",
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <header className="mb-6 ss-reveal" ss-reveal="">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">{category.blurb}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted tabular">
          {data.total} judul
        </p>
        <div className="mt-4">
          <AgeChips active={age} basePath={category.path} />
        </div>
      </header>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="text-muted">
            {age
              ? "Belum ada judul yang diberi label usia ini."
              : "Belum ada judul untuk filter ini."}
          </p>
          {age && (
            <a
              href={category.path}
              className="mt-3 inline-block text-sm font-bold text-pink hover:underline"
            >
              Lihat semua {category.name} →
            </a>
          )}
        </div>
      ) : (
        <TitleGrid>
          {data.items.map((t) => (
            <PosterCard key={t.id} title={t} />
          ))}
        </TitleGrid>
      )}

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        basePath={category.path}
        query={age ? { age } : {}}
      />
    </div>
  );
}
