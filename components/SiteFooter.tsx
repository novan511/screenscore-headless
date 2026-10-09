import Link from "next/link";

/**
 * Legacy footer: one flat sage field with the wordmark on the left, the
 * primary row centred (Tentang Kami … Information), socials on the right and
 * the copyright line below — no darker strip, no category columns, exactly
 * like the Astra footer the reference prints.
 *
 * The #b1b1a7 field is kept verbatim from the reference, but the *text* is
 * charcoal rather than white: white on that sage measured 2.16:1 and the
 * yellow wordmark 1.51:1, so every link in the footer was effectively
 * invisible — and it was the only Lighthouse accessibility failure on the
 * site. `ink` on the sage field reads 6.91:1, so the light, airy footer the
 * reference prints survives intact with the copy finally legible.
 */

const MAIN_LINKS = [
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "Series", href: "/series" },
  { label: "Film", href: "/films" },
  { label: "Game", href: "/game" },
  { label: "E-Books", href: "/e-books" },
];

/** The extras the reference hides behind the "Information" dropdown. */
const INFO_LINKS = [
  { label: "Aplikasi", href: "/aplikasi" },
  { label: "Artikel & Tips", href: "/blog" },
  { label: "Kontak", href: "/contact" },
  { label: "Ajukan Judul", href: "/ajukan-judul-baru" },
  { label: "Ketentuan", href: "/ketentuan-layanan-screenscore" },
  { label: "Privasi", href: "/privacy-policy" },
  { label: "Gadget", href: "/gadget" },
  { label: "Idola", href: "/idol" },
  { label: "Pro Player", href: "/pro-player" },
];

const SOCIALS = [
  {
    label: "Instagram",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.86s0 3.6-.07 4.86c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.9.07s-3.63 0-4.9-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.86c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.14 0-3.51.01-4.75.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71C3.42 8.9 3.4 9.27 3.4 12s.02 3.1.07 4.35c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.24.07-1.61.07-4.35s-.01-3.1-.07-4.35c-.04-.9-.19-1.39-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32C15.51 4.01 15.14 4 12 4Zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06Zm0 8.14A3.2 3.2 0 1 0 8.8 12a3.2 3.2 0 0 0 3.2 3.2Zm6.3-8.34a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z",
  },
  {
    label: "Facebook",
    path: "M12 2a10 10 0 0 0-1.57 19.88v-7.07H7.9v-2.81h2.53V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.81h-2.33v7.07A10 10 0 0 0 12 2Z",
  },
  {
    label: "YouTube",
    path: "M21.58 7.19a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41a2.51 2.51 0 0 0-1.77 1.78A26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .42 4.81 2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.51 2.51 0 0 0 1.77-1.78A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z",
  },
  {
    label: "Twitter",
    path: "M22 5.9c-.73.33-1.51.55-2.33.65a4.07 4.07 0 0 0 1.78-2.25 8.1 8.1 0 0 1-2.57.98A4.06 4.06 0 0 0 11.9 8.98c0 .32.03.63.1.93a11.53 11.53 0 0 1-8.37-4.24 4.06 4.06 0 0 0 1.26 5.42 4 4 0 0 1-1.84-.51v.05a4.06 4.06 0 0 0 3.26 3.98 4.1 4.1 0 0 1-1.83.07 4.07 4.07 0 0 0 3.8 2.82A8.15 8.15 0 0 1 2.58 19c-.33 0-.65-.02-.97-.06a11.5 11.5 0 0 0 6.22 1.82c7.47 0 11.55-6.18 11.55-11.55v-.53A8.2 8.2 0 0 0 22 5.9Z",
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-sage text-ink">
      <div className="ss-container pb-12 pt-14 md:pb-[86px] md:pt-[104px]">
        <div className="flex flex-col gap-9 md:grid md:grid-cols-[275px_1fr_auto] md:items-start md:gap-10">
          {/* wordmark — the reference prints the logo image at 275px wide */}
          <Link
            href="/"
            aria-label="ScreenScore — beranda"
            className="inline-flex min-h-11 items-center text-2xl font-extrabold tracking-tight md:w-[275px]"
          >
            <span className="text-ink">screen</span>
            {/* The two-tone wordmark had to go: on this sage field yellow is
                1.51:1 and even pink-600 only reaches 2.43:1, so no accent
                clears the 3:1 a 24px wordmark needs. Both halves are ink and
                the brand accent returns on every light surface instead. */}
            <span className="text-ink">score</span>
          </Link>

          {/* primary row, centred in the middle column */}
          <nav className="flex flex-col items-center gap-2 text-base md:flex-row md:flex-wrap md:justify-center md:gap-x-4 md:gap-y-1">
            {MAIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center transition hover:underline"
              >
                {link.label}
              </Link>
            ))}
            {/* CSS-only dropdown carrying the rest of the legacy menu */}
            <details className="relative">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center transition hover:underline">
                Information
              </summary>
              <ul className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl bg-white p-2 shadow-2xl">
                {INFO_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-blush hover:text-pink-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </nav>

          {/* socials on the right — href="" mirrors the legacy anchors */}
          <div className="flex items-center justify-center gap-7 md:justify-end">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href=""
                aria-label={social.label}
                className="grid h-11 w-11 place-items-center text-ink transition hover:text-pink-600"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <path fill="currentColor" d={social.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm leading-[1.6] text-ink-2 md:mt-[96px]">
          Copyright © {year} Screen Score | Powered by Digitalmama.id
        </p>
      </div>
    </footer>
  );
}
