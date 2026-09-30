import Link from "next/link";
import { CATEGORY_LIST, SITE } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-white/70">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="text-2xl font-extrabold">
            <span className="text-yellow">screen</span>
            <span className="text-pink">score</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            {SITE.tagline}. Kurasi jujur dari orang tua, untuk tontonan dan
            mainan yang aman bagi anak.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
            Kategori
          </h3>
          <ul className="space-y-2 text-sm">
            {CATEGORY_LIST.map((c) => (
              <li key={c.slug}>
                <Link href={c.path} className="hover:text-yellow">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
            Lainnya
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/tentang-kami" className="hover:text-yellow">Tentang Kami</Link></li>
            <li><Link href="/contact" className="hover:text-yellow">Kontak</Link></li>
            <li><Link href="/ajukan-judul-baru" className="hover:text-yellow">Ajukan Judul</Link></li>
            <li><Link href="/ketentuan-layanan-screenscore" className="hover:text-yellow">Ketentuan Layanan</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-yellow">Privasi</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs">
        © {new Date().getFullYear()} ScreenScore — WordPress headless + Next.js
      </div>
    </footer>
  );
}
