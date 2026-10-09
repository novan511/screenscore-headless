import Link from "next/link";
import { AGE_TAGS } from "@/lib/config";
import { cx } from "@/lib/utils";

/**
 * Candy-colour cycle for the age pills — one pastel per chip, no black.
 *
 * Every hover pairs a *darkened* shade of the same hue with white text. The
 * original mid-tones measured 2.7–2.9:1 against their own pastel fields, so
 * the label disappeared on hover; these clear 4.9:1 while keeping the
 * one-pastel-per-chip rhythm.
 */
const CHIP_STYLES = [
  "bg-blush hover:bg-pink-600 hover:text-white",
  "bg-cream hover:bg-yellow hover:text-ink",
  "bg-sky hover:bg-sky-600 hover:text-white",
  "bg-mint hover:bg-mint-600 hover:text-white",
  "bg-lav hover:bg-lav-600 hover:text-white",
] as const;

/** Age-band chips — the kid-safety filter entry point. */
export function AgeChips({
  active,
  basePath,
}: {
  active?: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AGE_TAGS.map((t, i) => {
        const isActive = active === t.slug;
        const href =
          t.slug === "semua-umur"
            ? basePath
            : `${basePath}?age=${encodeURIComponent(t.slug)}`;
        return (
          <Link
            key={t.slug}
            href={href}
            className={cx(
              "inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold text-ink transition",
              isActive ? "bg-pink-600 text-white" : CHIP_STYLES[i % CHIP_STYLES.length],
            )}
          >
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}
