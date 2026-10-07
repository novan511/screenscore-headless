import { Suspense } from "react";
import { PosterSlider } from "./PosterSlider";
import { SliderSkeleton } from "./SliderSkeleton";
import { catchUpstreamBuild } from "@/lib/http";
import { fetchLatest } from "@/lib/store";
import { toCard } from "@/lib/utils";
import type { Title } from "@/lib/types";

/**
 * One "Top Picks …" row of the legacy homepage: a left-aligned heading with
 * its blurb, then the loop carousel of posters underneath.
 *
 * The reference renders the row as an Elementor loop-carousel with 4 slides
 * on desktop / 2 on tablet / 1 on mobile, so `PosterSlider` takes those
 * numbers straight from the widget's `slides_to_show*` settings.
 *
 * The heading is static markup that flushes with the shell; only the card row
 * waits on WordPress, streaming in behind a skeleton that occupies the exact
 * same geometry (see `SliderSkeleton`) so nothing below it ever shifts.
 */
const RAIL_COLS = { desktop: 4, tablet: 2, mobile: 1 };

async function RailRow({
  category,
  label,
}: {
  category: string;
  label: string;
}) {
  const items = await fetchLatest(category, 8).catch(
    catchUpstreamBuild<Title[]>([]),
  );
  if (!items.length) return null;
  return (
    <PosterSlider
      items={items.map(toCard)}
      cols={RAIL_COLS}
      label={label}
    />
  );
}

export function TitleRail({
  id,
  heading,
  blurb,
  category,
}: {
  /** Stable id for `aria-labelledby` on the section. */
  id: string;
  heading: string;
  blurb: string;
  /** Store API category slug backing this row (film / game / e-books). */
  category: string;
}) {
  return (
    <section
      className="mt-12 sm:mt-16 ss-reveal"
      ss-reveal=""
      aria-labelledby={id}
    >
      <h2
        id={id}
        className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.6rem] lg:text-[3rem]"
      >
        {heading}
      </h2>
      <p className="mt-1.5 text-base text-muted">{blurb}</p>

      <div className="mt-5">
        <Suspense fallback={<SliderSkeleton cols={RAIL_COLS} label={heading} />}>
          <RailRow category={category} label={heading} />
        </Suspense>
      </div>
    </section>
  );
}
