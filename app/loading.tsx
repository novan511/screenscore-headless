/**
 * Root instant-loading state.
 *
 * Every route that has no segment-level `loading.tsx` of its own (content
 * detail, blog post, index pages) used to hold the *entire* response until
 * all of its upstream fetches resolved — no Suspense boundary anywhere meant
 * the first byte only shipped once WordPress had answered everything. This
 * boundary lets the shell (header, metadata, CSS) flush immediately and
 * paints a placeholder in its place.
 *
 * `min-h-screen` keeps the footer below the fold for the whole swap, so the
 * content arriving never moves a visible element (no CLS).
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat halaman…"
      className="mx-auto min-h-screen w-full max-w-[1200px] px-4 py-10 sm:px-6"
    >
      <div className="h-9 w-2/3 max-w-lg animate-pulse rounded bg-surface" />
      <div className="mt-4 h-4 w-40 animate-pulse rounded bg-surface" />

      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <div
              className="animate-pulse rounded-lg bg-surface"
              style={{ aspectRatio: "2 / 3" }}
            />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-surface" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
