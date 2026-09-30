"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * WordPress could not be reached (timeout / rate limit / 5xx).
 *
 * Deliberately not a 404: a missing product and an unreachable backend are
 * different things, and caching the latter as "not found" is what made live
 * pages disappear for minutes at a time.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center px-4 py-24 text-center">
      <span className="text-5xl" aria-hidden>
        ⚠️
      </span>
      <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
        Sedang gangguan koneksi ke Server
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Data judul diambil langsung dari WordPress dan servernya sedang sibuk.
        Coba muat ulang halaman beberapa detik lagi.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="press rounded-lg bg-pink px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-600"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="press rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-bold hover:border-pink"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
