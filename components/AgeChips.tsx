import Link from "next/link";
import { AGE_TAGS } from "@/lib/config";
import { cx } from "@/lib/utils";

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
      {AGE_TAGS.map((t) => {
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
              "rounded-full px-3.5 py-1.5 text-xs font-bold transition",
              isActive
                ? "bg-pink text-white"
                : "bg-surface text-ink hover:bg-ink hover:text-white",
            )}
          >
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}
