import { cx } from "@/lib/utils";

export function SearchForm({
  dark = false,
  autoFocus = false,
  defaultValue = "",
}: {
  dark?: boolean;
  autoFocus?: boolean;
  defaultValue?: string;
}) {
  return (
    <form action="/search" method="get" role="search" className="w-full">
      <label className="sr-only" htmlFor="q">
        Cari judul
      </label>
      <input
        id="q"
        name="q"
        type="search"
        required
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Cari film, game, e-book…"
        className={cx(
          "w-full rounded-full px-4 py-2 text-sm font-medium placeholder:font-normal",
          dark
            ? "bg-ink-3 text-white placeholder:text-white/50 focus:bg-ink-3"
            : "bg-surface text-ink placeholder:text-muted",
        )}
      />
    </form>
  );
}
