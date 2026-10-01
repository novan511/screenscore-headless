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
        /*
         * 16px type on phones: iOS Safari auto-zooms any input under 16px on
         * focus, which breaks the header layout. min-h-11 keeps the 44px
         * touch target. Desktop keeps the compact 14px look.
         */
        className="min-h-11 w-full rounded-full border border-line bg-white px-4 py-2 text-base font-medium text-ink placeholder:font-normal placeholder:text-muted focus:border-pink sm:text-sm"
      />
    </form>
  );
}
