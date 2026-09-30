import Link from "next/link";
import { CATEGORY_LIST } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-yellow">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">Judulnya belum ketemu</h1>
      <p className="mt-2 text-sm text-muted">
        Mungkin judulnya belum masuk database, atau tautannya sudah berubah.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white"
        >
          Ke Beranda
        </Link>
        {CATEGORY_LIST.map((c) => (
          <Link
            key={c.slug}
            href={c.path}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-bold hover:border-ink"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
