import Link from "next/link";
import type { Title } from "@/lib/types";
import { PosterCard } from "./PosterCard";

/** Horizontal IMDb-style “rail” of posters. */
export function Rail({
  heading,
  blurb,
  href,
  items,
  moreLabel = "Lihat semua",
}: {
  heading: string;
  blurb?: string;
  href: string;
  items: Title[];
  moreLabel?: string;
}) {
  if (!items.length) return null;
  return (
    <section
      className="mt-12 ss-reveal"
      ss-reveal=""
      /* ScrollReveal sets data-ss-reveal on this element after the server
         render but before this segment hydrates (the layout effect runs
         first), so the attribute is legitimately absent from the props. */
      suppressHydrationWarning
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">{heading}</h2>
          {blurb && <p className="mt-0.5 text-sm text-muted">{blurb}</p>}
        </div>
        <Link
          href={href}
          /* Inline "see all" links sit in a row header — the vertical padding
             brings the tap height to 44px without moving the layout. */
          className="inline-flex min-h-11 shrink-0 items-center rounded-md px-1 text-sm font-bold text-pink hover:underline"
        >
          {moreLabel} →
        </Link>
      </div>
      <div className="rail ss-stagger">
        {items.map((t) => (
          <PosterCard key={t.id} title={t} width={156} />
        ))}
      </div>
    </section>
  );
}
