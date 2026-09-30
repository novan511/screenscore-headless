import { cx } from "@/lib/utils";

/** IMDb-style star row. size: sm (cards) | md | lg (detail). */
export function RatingStars({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
}) {
  const full = Math.round(value);
  const text =
    size === "lg" ? "text-2xl" : size === "md" ? "base" : "sm";
  if (!value) return null;
  return (
    <span
      className={cx("inline-flex items-center gap-1", text)}
      aria-label={`${value} dari 5`}
    >
      <span className="tracking-tight text-yellow" aria-hidden>
        {"★".repeat(full)}
        <span className="text-line">{"★".repeat(5 - full)}</span>
      </span>
      <span className="tabular text-xs font-bold text-muted">
        {value % 1 === 0 ? value.toFixed(1) : value.toFixed(1)}
        {typeof count === "number" && count > 0 && (
          <span className="font-medium"> ({count})</span>
        )}
      </span>
    </span>
  );
}
