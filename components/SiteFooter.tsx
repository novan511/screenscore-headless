import Link from "next/link";
import { CATEGORY_LIST, SITE } from "@/lib/config";

/**
 * Legacy footer, restyled rather than replaced: the Astra builder prints a
 * warm sage field with the primary nav centred, socials to the right and the
 * copyright on a slightly darker strip below. The column groups stay because
 * they carry links the single-row legacy menu cannot.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 bg-sage text-white">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">
            <span className="text-white">screen</span>
            <span className="text-yellow">score</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/85">
            {SITE.tagline}. Kurasi jujur dari orang tua, untuk tontonan dan
            mainan yang aman bagi anak.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
            Kategori
          </h3>
          <ul className="space-y-1 text-sm">
            {CATEGORY_LIST.map((c) => (
              <li key={c.slug}>
                <Link
                  href={c.path}
                  className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/gadget"
                className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline"
              >
                Gadget
              </Link>
            </li>
            <li>
              <Link
                href="/idol"
                className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline"
              >
                Idola
              </Link>
            </li>
            <li>
              <Link
                href="/pro-player"
                className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline"
              >
                Pro Player
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
            Lainnya
          </h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/blog" className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline">Artikel &amp; Tips</Link></li>
            <li><Link href="/tentang-kami" className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline">Tentang Kami</Link></li>
            <li><Link href="/contact" className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline">Kontak</Link></li>
            <li><Link href="/ajukan-judul-baru" className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline">Ajukan Judul</Link></li>
            <li><Link href="/ketentuan-layanan-screenscore" className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline">Ketentuan Layanan</Link></li>
            <li><Link href="/privacy-policy" className="inline-flex min-h-11 items-center rounded-md pr-2 text-white/85 transition hover:text-white hover:underline">Privasi</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/25 bg-sage-600 py-5 text-center text-xs text-white/90">
        © {new Date().getFullYear()} {SITE.name} | Powered by Digitalmama.id
      </div>
    </footer>
  );
}
