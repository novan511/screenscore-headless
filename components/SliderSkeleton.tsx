import type { CSSProperties } from "react";

/**
 * Geometry-matched stand-in for `PosterSlider` while its data streams in.
 *
 * It reuses the real `.ss-slider` / `.ss-slide` layout from `globals.css`
 * with the same `--ss-cols-*` variables, so the skeleton occupies exactly
 * the space the carousel will — the rest of the page never shifts when the
 * cards arrive (CLS stays at 0 on cold, streaming renders).
 */
export function SliderSkeleton({
  cols,
  label,
}: {
  cols: { desktop: number; tablet: number; mobile: number };
  label: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={`${label} — memuat`}
      className="relative"
    >
      <div
        className="ss-slider"
        style={
          {
            "--ss-cols-mobile": String(cols.mobile),
            "--ss-cols-tablet": String(cols.tablet),
            "--ss-cols-desktop": String(cols.desktop),
          } as CSSProperties
        }
      >
        <div className="ss-track">
          {Array.from({ length: cols.desktop * 2 }, (_, i) => (
            <div className="ss-slide" key={i} aria-hidden>
              <div className="h-full rounded-[4px] bg-white p-5">
                <div
                  className="w-full animate-pulse rounded-lg bg-surface"
                  style={{ aspectRatio: "2 / 3" }}
                />
                {/* matches the real card's two-line title + meta row */}
                <div className="mt-2 h-14 animate-pulse rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
