/**
 * Shimmer skeleton for routes that stream their first render — mirrors the
 * archive grid so nothing jumps on arrival.
 *
 * Deliberately NOT at the app root: a root `loading.tsx` flushes a 200 shell
 * before `notFound()` can run, which turns every missing URL into a soft 404
 * (200 + "page not found" body) and burns crawl budget.
 */
export function LoadingGrid({
  label = "Memuat halaman…",
}: {
  label?: string;
}) {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>

      <div className="skeleton h-9 w-56 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-80 max-w-full rounded" />
      <div className="skeleton mt-5 h-7 w-64 rounded-full" />

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[2/3] w-full rounded-lg" />
            <div className="skeleton mt-2.5 h-4 w-4/5 rounded" />
            <div className="skeleton mt-2 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
