import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORY_LIST } from "@/lib/config";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-24 text-center">
      {/* The 404 was printed in brand yellow, which measures 1.43:1 on white —
          effectively invisible. Pink-600 keeps the accent at 5.26:1. */}
      <p className="text-6xl font-extrabold text-pink-600">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">Judulnya belum ketemu</h1>
      <p className="mt-2 text-sm text-muted">
        Mungkin judulnya belum masuk database, atau tautannya sudah berubah.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="press inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white"
        >
          Ke Beranda
        </Link>
        {CATEGORY_LIST.map((c) => (
          <Link
            key={c.slug}
            href={c.path}
            className="press inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-bold hover:border-ink"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
