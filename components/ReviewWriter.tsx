"use client";

import { useEffect, useState } from "react";
import type { ReviewField } from "@/lib/reviews";

/**
 * Write-review entry point. Server-renders the guest gate (the common case),
 * then checks in the background whether the visitor holds a WordPress member
 * session — members swap to the form with the field set discovered from the
 * WordPress page itself.
 */
export function ReviewWriter({
  slug,
  postId,
  wpSite,
  returnPath,
}: {
  slug: string;
  postId: number;
  wpSite: string;
  returnPath: string;
}) {
  const [view, setView] = useState<"guest" | "form" | "already">("guest");
  const [fields, setFields] = useState<ReviewField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [starValues, setStarValues] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { loggedIn?: boolean; alreadyReviewed?: boolean; fields?: ReviewField[] } | null) => {
        if (!alive || !data?.loggedIn) return;
        if (data.alreadyReviewed) {
          setView("already");
          return;
        }
        setFields(
          Array.isArray(data.fields) && data.fields.length
            ? data.fields
            : DEFAULT_FIELDS,
        );
        setView("form");
      })
      .catch(() => {
        // gate check is best-effort — the guest gate stays visible
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const loginUrl = `${wpSite}/wp-login.php?redirect_to=${encodeURIComponent(returnPath)}`;
  const registerUrl = `${wpSite}/wp-login.php?action=register`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const title = values.title ?? "";
    const content = values.content ?? "";
    if (!title.trim() || !content.trim()) {
      setResult({ success: false, message: "Judul dan isi review wajib diisi." });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("post_id", String(postId));
      fd.set("title", title);
      fd.set("content", content);
      for (const field of fields) {
        if (field.kind === "stars") {
          fd.set(field.name, String(starValues[field.name] ?? 0));
        }
      }
      const res = await fetch("/api/reviews", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      setResult({
        success: data?.success === true,
        message:
          data?.message ||
          (data?.success
            ? "Review berhasil dikirim! Menunggu persetujuan admin."
            : "Terjadi kesalahan. Silakan coba lagi."),
      });
      if (data?.success) setView("already"); // form is replaced by the success card
    } catch {
      setResult({
        success: false,
        message: "Gagal mengirim. Periksa koneksi lalu coba lagi.",
      });
    } finally {
      setSending(false);
    }
  }

  /* ---------------- success card ---------------- */
  if (result?.success) {
    return (
      <div className="rounded-2xl border border-line bg-canvas p-5 sm:p-6">
        <p className="text-sm font-extrabold text-ok">{result.message}</p>
        <p className="mt-1.5 text-sm text-muted">
          Review kamu akan muncul di daftar review member setelah disetujui
          admin.
        </p>
      </div>
    );
  }

  /* ---------------- already-reviewed notice ---------------- */
  if (view === "already") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="text-sm font-bold text-ink">
          Kamu sudah menulis review untuk judul ini.
        </p>
        <p className="mt-1 text-sm text-muted">
          Review tetap tampil setelah disetujui admin.
        </p>
      </div>
    );
  }

  /* ---------------- member form ---------------- */
  if (view === "form") {
    const textFields = fields.filter((f) => f.kind !== "stars");
    const starFields = fields.filter((f) => f.kind === "stars");
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
      >
        <h3 className="text-lg font-extrabold">Tulis Review</h3>
        <p className="mt-1 text-xs font-semibold text-muted">
          Khusus member · Review tampil setelah disetujui admin
        </p>

        <div className="mt-4 space-y-4">
          {textFields.map((field) =>
            field.kind === "textarea" ? (
              <div key={field.name}>
                <label
                  htmlFor={`rf-${field.name}`}
                  className="mb-1.5 block text-sm font-bold"
                >
                  {field.label}
                </label>
                <textarea
                  id={`rf-${field.name}`}
                  name={field.name}
                  required
                  rows={5}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm leading-relaxed"
                  placeholder="Ceritakan pengalaman menonton/membaca bersama si kecil…"
                />
              </div>
            ) : (
              <div key={field.name}>
                <label
                  htmlFor={`rf-${field.name}`}
                  className="mb-1.5 block text-sm font-bold"
                >
                  {field.label}
                </label>
                <input
                  id={`rf-${field.name}`}
                  name={field.name}
                  type="text"
                  required
                  maxLength={200}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm"
                  placeholder="Ringkasan review kamu"
                />
              </div>
            ),
          )}

          {starFields.length > 0 && (
            <fieldset className="rounded-xl border border-line bg-canvas p-4">
              <legend className="px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-pink">
                Penilaian
              </legend>
              <div className="mt-1.5 space-y-2">
                {starFields.map((field) => (
                  <StarRow
                    key={field.name}
                    label={field.label}
                    value={starValues[field.name] ?? 0}
                    onChange={(v) =>
                      setStarValues((s) => ({ ...s, [field.name]: v }))
                    }
                  />
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {result && !result.success && (
          <p className="mt-3 text-sm font-bold text-red-600">{result.message}</p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="press mt-5 rounded-full bg-pink px-6 py-2.5 text-sm font-extrabold text-white hover:bg-pink-600 disabled:pointer-events-none disabled:opacity-60"
        >
          {sending ? "Mengirim…" : "Kirim Review"}
        </button>
      </form>
    );
  }

  /* ---------------- guest gate (default) ---------------- */
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow text-xl text-ink"
        >
          ★
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold">Ingin menulis review?</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink/75">
            Login atau daftar untuk memberikan review. Review kamu tampil di
            halaman ini setelah disetujui admin.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={loginUrl}
              className="press rounded-full bg-pink px-5 py-2.5 text-sm font-extrabold text-white hover:bg-pink-600"
            >
              Login
            </a>
            <a
              href={registerUrl}
              className="press rounded-full border border-line bg-canvas px-5 py-2.5 text-sm font-bold text-ink hover:border-ink"
            >
              Daftar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FIELDS: ReviewField[] = [
  { kind: "text", name: "title", label: "Judul review" },
  { kind: "textarea", name: "content", label: "Tulis review kamu" },
];

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span className="text-sm font-semibold">{label}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${label}: ${star} dari 5`}
            onClick={() => onChange(star)}
            className={`press px-0.5 text-lg leading-none ${
              star <= value ? "text-yellow-600" : "text-line hover:text-yellow-600/50"
            }`}
          >
            ★
          </button>
        ))}
      </span>
    </div>
  );
}
