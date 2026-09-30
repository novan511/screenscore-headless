export function SearchForm({
  autoFocus = false,
  defaultValue = "",
}: {
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
        className="w-full rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink placeholder:font-normal placeholder:text-muted focus:border-pink"
      />
    </form>
  );
}
