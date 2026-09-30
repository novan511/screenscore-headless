import Link from "next/link";
import { CATEGORY_LIST } from "@/lib/config";
import { SearchForm } from "./SearchForm";

const SECONDARY = [
  { label: "Artikel", href: "/blog" },
  { label: "Orang", href: "/cast" },
  { label: "Tentang", href: "/tentang-kami" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/80 text-ink backdrop-blur-2xl">
      {/* brand ribbon — pink → yellow → sky, the anti-black signature */}
      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-pink via-yellow to-sky-600"
      />
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-2xl font-extrabold tracking-tight">
          <span className="text-ink">screen</span>
          <span className="text-pink">score</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-5 lg:flex">
          {CATEGORY_LIST.map((c) => (
            <Link
              key={c.slug}
              href={c.path}
              className="text-sm font-semibold text-ink/75 transition hover:text-pink"
            >
              {c.name}
            </Link>
          ))}
          {SECONDARY.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="text-sm font-semibold text-ink/75 transition hover:text-pink"
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden w-64 md:block">
          <SearchForm />
        </div>

        {/* mobile: CSS-only menu */}
        <details className="relative ml-auto lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink/80 transition hover:bg-blush hover:text-pink">
            <span aria-hidden className="menu-bars">
              ☰
            </span>
            Menu
          </summary>
          <div className="menu-panel absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-white p-4 shadow-2xl">
            <div className="mb-3">
              <SearchForm />
            </div>
            <ul className="space-y-2">
              {CATEGORY_LIST.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={c.path}
                    className="block rounded px-2 py-1.5 text-sm font-semibold hover:bg-blush hover:text-pink"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              {SECONDARY.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="block rounded px-2 py-1.5 text-sm font-semibold hover:bg-blush hover:text-pink"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </header>
  );
}
