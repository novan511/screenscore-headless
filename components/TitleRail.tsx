import { PosterSlider } from "./PosterSlider";
import type { Title } from "@/lib/types";

/**
 * One "Top Picks …" row of the legacy homepage: a left-aligned heading with
 * its blurb, then the loop carousel of posters underneath.
 *
 * The reference renders the row as an Elementor loop-carousel with 4 slides
 * on desktop / 2 on tablet / 1 on mobile, so `PosterSlider` takes those
 * numbers straight from the widget's `slides_to_show*` settings.
 */
export function TitleRail({
  id,
  heading,
  blurb,
  items,
}: {
  /** Stable id for `aria-labelledby` on the section. */
  id: string;
  heading: string;
  blurb: string;
  items: Title[];
}) {
  if (!items.length) return null;

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
        <PosterSlider
          items={items}
          cols={{ desktop: 4, tablet: 2, mobile: 1 }}
          label={heading}
        />
      </div>
    </section>
  );
}
