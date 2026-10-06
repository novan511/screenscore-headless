/**
 * Site search. Two skins:
 *  - `pill`   — the compact header field (rounded, no visible button).
 *  - `boxed`  — the legacy homepage search: white 3px-radius container with
 *               a black square icon button, exactly like the Astra/Elementor
 *               search-form widget on screenscore.digitalmama.id.
 */
export function SearchForm({
  autoFocus = false,
  defaultValue = "",
  variant = "pill",
}: {
  autoFocus?: boolean;
  defaultValue?: string;
  variant?: "pill" | "boxed";
}) {
  if (variant === "boxed") {
    return (
      <form
        action="/search"
        method="get"
        role="search"
        className="flex w-full items-stretch overflow-hidden rounded-[3px] bg-white ring-1 ring-line"
      >
        <label className="sr-only" htmlFor="q-boxed">
          Cari judul
        </label>
        <input
          id="q-boxed"
          name="q"
          type="search"
          required
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="Cari di sini…"
          /*
            16px type: iOS Safari auto-zooms inputs under 16px on focus.
            The 50px square submit keeps the legacy widget's proportions
            and clears the 44px touch-target rule on its own.
          */
          className="min-h-[50px] min-w-0 flex-1 border-0 bg-transparent px-4 text-base text-ink placeholder:text-muted/80 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Cari"
          className="grid w-[50px] shrink-0 place-items-center bg-black text-white transition hover:bg-pink"
        >
          <SearchIcon />
        </button>
      </form>
    );
  }

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

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M20 20l-3.6-3.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
