import Link from "next/link";
import { CATEGORY_LIST, SITE } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface text-muted">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="text-2xl font-extrabold">
            <span className="text-ink">screen</span>
            <span className="text-pink">score</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            {SITE.tagline}. Kurasi jujur dari orang tua, untuk tontonan dan
            mainan yang aman bagi anak.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink">
            Kategori
          </h3>
          <ul className="space-y-1 text-sm">
            {CATEGORY_LIST.map((c) => (
              <li key={c.slug}>
                <Link href={c.path} className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/gadget" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">
                Gadget
              </Link>
            </li>
            <li>
              <Link href="/idol" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">
                Idola
              </Link>
            </li>
            <li>
              <Link href="/pro-player" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">
                Pro Player
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink">
            Lainnya
          </h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/blog" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">Artikel & Tips</Link></li>
            <li><Link href="/tentang-kami" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">Tentang Kami</Link></li>
            <li><Link href="/contact" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">Kontak</Link></li>
            <li><Link href="/ajukan-judul-baru" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">Ajukan Judul</Link></li>
            <li><Link href="/ketentuan-layanan-screenscore" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">Ketentuan Layanan</Link></li>
            <li><Link href="/privacy-policy" className="inline-flex min-h-11 items-center rounded-md pr-2 hover:text-pink">Privasi</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs">
        © {new Date().getFullYear()} {SITE.name} — {SITE.tagline}
      </div>
    </footer>
  );
}
