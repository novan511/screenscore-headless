import type { Metadata } from "next";
import Link from "next/link";
import { DEMO } from "@/lib/seo/demo";
import type { AuditRow, DemandRow, FixRow } from "@/lib/seo/demo";
import { readSnapshot } from "@/lib/seo/store";
import { cx } from "@/lib/utils";

/**
 * Laporan SEO & GEO — langkah 1 (ukur) dan langkah 2 (temukan) dari loop.
 *
 * Angka datang dari readSnapshot(): membaca .study/seo/* yang ditulis oleh
 * scripts/seo-batch.mjs atau cron /api/cron/seo. Kalau belum pernah jalan,
 * store jatuh balik ke benih Fase 0 (lib/seo/real.ts) — jadi build tidak
 * pernah gagal, dan label CONTOH menandai bagian yang memang belum dijalankan.
 *
 * Noindex: halaman kerja, bukan konten untuk mesin pencari.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "SEO & GEO Lab",
  description: "Laporan pengukuran SEO & GEO mingguan ScreenScore.",
  robots: { index: false, follow: false },
};

const IMPACT: Record<FixRow["impact"], string> = {
  tinggi: "bg-blush text-pink-600",
  sedang: "bg-cream text-ink-2",
  rendah: "bg-surface text-muted",
};

const STATUS: Record<FixRow["status"], { label: string; cls: string }> = {
  todo: { label: "Belum", cls: "bg-surface text-muted" },
  draft: { label: "Draft", cls: "bg-cream text-ink-2" },
  done: { label: "Selesai", cls: "bg-mint text-mint-600" },
};

const SEVERITY: Record<AuditRow["severity"], { label: string; cls: string }> = {
  error: { label: "ERROR", cls: "bg-pink text-white" },
  warn: { label: "PERINGATAN", cls: "bg-yellow text-ink" },
  info: { label: "INFO", cls: "bg-sky text-ink-2" },
};

const ANSWERED: Record<DemandRow["answered"], { label: string; cls: string }> = {
  kita: { label: "sudah kita jawab", cls: "bg-mint text-mint-600" },
  lawan: { label: "dijawab kompetitor", cls: "bg-cream text-ink-2" },
  belum: { label: "BELUM DIJAWAB SIAPA PUN", cls: "bg-pink text-white" },
};

function Step({ n, title, sub, tone }: { n: string; title: string; sub: string; tone: string }) {
  return (
    <div className={cx("rounded-3xl border border-line p-5", tone)}>
      <span className="text-xs font-black tracking-widest">{n}</span>
      <p className="mt-1 text-lg font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

function Panel({
  step,
  title,
  note,
  flag,
  children,
}: {
  step: string;
  title: string;
  note?: string;
  flag?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-white">{step}</span>
        <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
        {flag && <Flag real />}
        {note && <span className="text-sm text-muted">{note}</span>}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Penanda supaya data asli tidak pernah ketuker dengan data contoh. */
function Flag({ real }: { real: boolean }) {
  return (
    <span
      className={cx(
        "rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide",
        real ? "bg-mint-600 text-white" : "bg-yellow text-ink",
      )}
    >
      {real ? "DATA ASLI" : "CONTOH"}
    </span>
  );
}

function Stat({ value, label, tone = "text-ink" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="p-5">
      <p className={cx("text-3xl font-black", tone)}>{value}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{label}</p>
    </div>
  );
}

export default async function SeoLabPage() {
  const snap = readSnapshot();
  const live = snap.source === "live";

  /** Siapa paling sering dikutip Google AI Overview di seluruh kata kunci. */
  const aiCited = new Map<string, number>();
  for (const row of snap.serp.rows) {
    for (const d of row.aiOverview.cited) {
      if (d && !d.includes("screenscore")) aiCited.set(d, (aiCited.get(d) ?? 0) + 1);
    }
  }
  const aiLeaders = [...aiCited.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const geoByVerdict = [...snap.geo.rows].sort(
    (a, b) => Number(b.mentionedUs) - Number(a.mentionedUs) || a.index - b.index,
  );
  const serpByRank = [...snap.serp.rows].sort(
    (a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.index - b.index,
  );

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm font-semibold text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-pink">
              Beranda
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-ink" aria-current="page">
            SEO Lab
          </li>
        </ol>
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">🔬 SEO &amp; GEO Lab</h1>
          <Flag real={live} />
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Laporan pengukuran mingguan. Kartu bertanda <strong>DATA ASLI</strong> diisi dari run
          yang benar-benar dibayar; bagian bertanda <strong>CONTOH</strong> adalah probe yang belum
          dijalankan. Semua angka ter-update otomatis setelah cron selesai — tanpa build ulang.
        </p>
        <p className="mt-2 text-xs font-semibold text-muted">
          {snap.updatedAt ? `Snapshot: ${snap.updatedAt}` : "Belum ada snapshot"} ·{" "}
          {live ? "sumber: .study/seo (pipeline)" : "sumber: benih Fase 0"}
        </p>
      </header>

      {/* ── Ringkasan ─────────────────────────────────────── */}
      <section className="mt-6 overflow-hidden rounded-3xl border-2 border-mint-600">
        <div className="flex flex-wrap items-center gap-2 bg-mint-600 px-5 py-3">
          <span className="text-sm font-black text-white">✔ Ringkasan pengukuran</span>
          <span className="text-xs font-semibold text-white/80">
            {snap.geo.asked} pertanyaan AI · {snap.serp.tracked} kata kunci ·{" "}
            ${(snap.geo.spent + snap.serp.spent).toFixed(4)} terpakai
          </span>
        </div>
        <div className="grid divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <Stat
            value={`${snap.geo.mentioned}/${snap.geo.asked}`}
            label="pertanyaan AI yang menyebut kita"
            tone={snap.geo.mentioned === 0 ? "text-pink" : "text-mint-600"}
          />
          <Stat
            value={String(snap.serp.inTop10)}
            label={`kata kunci masuk 10 besar (dari ${snap.serp.tracked})`}
            tone={snap.serp.inTop10 === 0 ? "text-pink" : "text-mint-600"}
          />
          <Stat
            value={String(snap.serp.withAiOverview)}
            label="kata kunci yang memunculkan Google AI Overview"
          />
          <Stat
            value={`$${snap.budget.spent.toFixed(4)}`}
            label={`terpakai · ${snap.budget.failed} gagal · sisa pagu proses`}
          />
        </div>
      </section>

      {/* ── Alur ─────────────────────────────────────────── */}
      <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
        <Step n="LANGKAH 1" title="UKUR" sub="Kita ada di posisi berapa? Disebut AI nggak?" tone="bg-sky" />
        <div className="hidden items-center text-2xl text-muted sm:flex" aria-hidden>→</div>
        <Step n="LANGKAH 2" title="TEMUKAN" sub="Orang tua lagi nanya apa yang belum kita jawab?" tone="bg-cream" />
        <div className="hidden items-center text-2xl text-muted sm:flex" aria-hidden>→</div>
        <Step n="LANGKAH 3" title="PERBAIKI" sub="Tulis & benerin. Hasilnya ketauan lagi di Langkah 1." tone="bg-mint" />
      </div>
      <p className="mt-2 text-center text-xs font-bold text-muted">
        ↻ Muter tiap minggu · dijalankan cron, tanpa orang
      </p>

      {/* ── Langkah 1a: GEO ──────────────────────────────── */}
      <Panel
        step="LANGKAH 1"
        title="Didatangi AI nggak?"
        flag
        note={`${snap.geo.asked} pertanyaan · ${snap.geo.spent.toFixed(4)} USD · ${snap.geo.failed} gagal`}
      >
        <div className="mb-4 rounded-3xl border border-line bg-surface p-5">
          <p className="text-sm font-bold text-ink">Cara membacanya</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Setiap pertanyaan dikirim beneran ke ChatGPT, lalu jawabannya dicari kata
            <span className="font-semibold text-ink"> screenscore</span>. Baris hijau = kita masuk
            ke jawaban AI. Baris tanpa situs dikutip = AI menjawab dari ingatan model — di situ
            peluang kita paling besar, karena tidak ada yang harus digeser.
          </p>
        </div>

        <div className="max-h-[560px] overflow-y-auto rounded-3xl border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs font-black uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Pertanyaan yang dikirim ke AI</th>
                <th className="px-4 py-3">Kita</th>
                <th className="px-4 py-3">Yang dikutip AI</th>
                <th className="px-4 py-3 text-right">Biaya</th>
              </tr>
            </thead>
            <tbody>
              {geoByVerdict.map((r) => (
                <tr key={r.index} className="border-t border-line align-top">
                  <td className="px-4 py-3 text-ink">
                    <span className="line-clamp-2">{r.prompt}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-black",
                        r.mentionedUs ? "bg-mint-600 text-white" : "bg-surface text-muted",
                      )}
                    >
                      {r.mentionedUs ? "urutan 1" : "tidak disebut"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {r.competitors.length === 0 ? (
                        <span className="text-xs font-semibold text-muted">
                          tanpa sumber{r.webSearch ? "" : " (web_search=false)"}
                        </span>
                      ) : (
                        r.competitors.map((c) => (
                          <span key={c} className="rounded-full bg-blush px-2.5 py-1 text-xs font-bold text-pink-600">
                            {c}
                          </span>
                        ))
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted">
                    ${r.cost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Langkah 1b: SERP ─────────────────────────────── */}
      <Panel
        step="LANGKAH 1"
        title="Posisi di Google"
        flag
        note={`${snap.serp.tracked} kata kunci · ${snap.serp.inTop10} masuk 10 besar · ${snap.serp.spent.toFixed(4)} USD`}
      >
        {aiLeaders.length > 0 && (
          <div className="mb-4 rounded-3xl border border-line bg-cream p-5">
            <p className="text-sm font-bold text-ink">
              Siapa yang paling sering dikutip Google AI Overview
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiLeaders.map(([domain, count]) => (
                <span
                  key={domain}
                  className="rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-ink"
                >
                  {domain} <span className="text-pink">×{count}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Inilah daftar yang harus digeser. Kita:{" "}
              <span className="font-bold text-pink">
                {snap.serp.rows.filter((r) => r.rank !== null).length} kata kunci di 10 besar
              </span>
              .
            </p>
          </div>
        )}

        <div className="max-h-[560px] overflow-y-auto rounded-3xl border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs font-black uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-3">Kata kunci</th>
                <th className="px-4 py-3">Posisi</th>
                <th className="px-4 py-3">AI Overview</th>
                <th className="px-4 py-3 text-right">PAA</th>
              </tr>
            </thead>
            <tbody>
              {serpByRank.map((r) => (
                <tr key={r.index} className="border-t border-line">
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.keyword}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cx(
                        "inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 font-black",
                        r.rank === null
                          ? "bg-surface text-xs text-muted"
                          : r.rank <= 10
                            ? "bg-yellow text-ink"
                            : "bg-cream text-ink-2",
                      )}
                      title={r.rank === null ? "di luar 10 besar" : `posisi ${r.rank}`}
                    >
                      {r.rank ?? ">10"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.aiOverview.present ? (
                      <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-black text-ink-2">
                        ada
                        {r.aiOverview.cited.length > 0 && ` · ${r.aiOverview.cited.length} sumber`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted">
                    {r.peopleAlsoAsk || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          <span className="font-bold text-ink">&gt;10</span> = tidak muncul di halaman pertama
          Google. PAA = jumlah People Also Ask, bahan untuk Langkah 2.
        </p>
      </Panel>

      {/* ── Langkah 2: demand ────────────────────────────── */}
      <Panel
        step="LANGKAH 2"
        title="Yang ditanya orang, belum dijawab siapa pun"
        note="probe Reddit / komentar YouTube / autocomplete belum dijalankan"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Flag real={false} />
          <span className="text-xs text-muted">
            Begitu probe ini jalan, kartu di bawah terisi otomatis dari hasil scrape.
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {DEMO.demand.map((d: DemandRow) => (
            <article key={d.question} className="rounded-3xl border border-line bg-canvas p-5">
              <p className="font-bold text-ink">{d.question}</p>
              <p className="mt-1 text-xs text-muted">
                {d.source} · ±{d.volume} tanya/bulan
              </p>
              <span
                className={cx(
                  "mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-black",
                  ANSWERED[d.answered].cls,
                )}
              >
                {ANSWERED[d.answered].label}
              </span>
            </article>
          ))}
        </div>
      </Panel>

      {/* ── Langkah 3: perbaikan + audit ─────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Panel step="LANGKAH 3" title="Antrean perbaikan" note="disusun dari temuan Langkah 1">
          <div className="mb-3 flex items-center gap-2">
            <Flag real={false} />
            <span className="text-xs text-muted">mulai dari atas: dampak paling tinggi</span>
          </div>
          <ul className="space-y-2.5">
            {DEMO.fixes.map((f: FixRow) => (
              <li key={f.task} className="flex items-start gap-3 rounded-2xl border border-line bg-canvas p-4">
                <span
                  className={cx(
                    "mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 text-center text-xs font-black leading-[1.1]",
                    f.status === "done" ? "border-mint-600 bg-mint-600 text-white" : "border-line",
                  )}
                  aria-hidden
                >
                  {f.status === "done" ? "✓" : ""}
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{f.task}</span>
                <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-black", IMPACT[f.impact])}>
                  {f.impact}
                </span>
                <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-black", STATUS[f.status].cls)}>
                  {STATUS[f.status].label}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel step="LANGKAH 3" title="Audit teknis situs sendiri" note="probe crawl belum dijalankan">
          <div className="mb-3 flex items-center gap-2">
            <Flag real={false} />
            <span className="text-xs text-muted">dicek otomatis tiap minggu setelah probe crawl aktif</span>
          </div>
          <ul className="space-y-2.5">
            {DEMO.audit.map((a: AuditRow) => (
              <li key={a.finding} className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4">
                <span className={cx("rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide", SEVERITY[a.severity].cls)}>
                  {SEVERITY[a.severity].label}
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{a.finding}</span>
                <span className="text-xs text-muted">{a.scope}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* ── Biaya ────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl bg-ink p-6 text-white">
        <p className="text-xs font-black uppercase tracking-widest text-yellow">Biaya</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-3xl font-black">${snap.geo.spent.toFixed(4)}</p>
            <p className="text-xs text-white/70">probe GEO · {snap.geo.asked} run</p>
          </div>
          <div>
            <p className="text-3xl font-black">${snap.serp.spent.toFixed(4)}</p>
            <p className="text-xs text-white/70">probe SERP · {snap.serp.tracked} run</p>
          </div>
          <div>
            <p className="text-3xl font-black">$0,00</p>
            <p className="text-xs text-white/70">
              discover + inspect ({snap.catalog.length} baris katalog) — gratis
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-white/15 pt-3 text-xs text-white/70">
          Semua lewat satu akun Monid, satu saldo, tanpa langganan. Pagu keras per proses $2 —
          pipeline mematikan dirinya sendiri sebelum menyentuh itu.
        </p>
      </section>

      <footer className="mt-6 rounded-3xl border border-dashed border-line bg-surface p-6 text-sm text-muted">
        <p className="font-bold text-ink">Posisi proyek:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>✅ Fase 0 — katalog diverifikasi, semua tool ketemu</li>
          <li>✅ Batch pertama — {snap.geo.asked} pertanyaan &amp; {snap.serp.tracked} kata kunci berjalan</li>
          <li>✅ Pipeline — klien + store + route cron (/api/cron/seo)</li>
          <li>⬜ Jadwal cron di server → pengukuran mingguan jalan sendiri</li>
          <li>⬜ Probe Langkah 2 (Reddit / komentar YouTube) → antrean konten otomatis</li>
        </ol>
      </footer>
    </div>
  );
}
