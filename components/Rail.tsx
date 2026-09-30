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
    <section className="mt-12 ss-reveal" ss-reveal="">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">{heading}</h2>
          {blurb && <p className="mt-0.5 text-sm text-muted">{blurb}</p>}
        </div>
        <Link
          href={href}
          className="shrink-0 text-sm font-bold text-pink hover:underline"
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
