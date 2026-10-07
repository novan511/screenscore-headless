/**
 * Cron pipeline SEO/GEO — penerjemah langkah 1 & 2 di /seo-lab jadi jadwal.
 *
 *   GET /api/cron/seo?probe=geo&limit=8      &secret=<CRON_SECRET>
 *   GET /api/cron/seo?probe=serp&limit=8     &secret=<CRON_SECRET>
 *
 * Kenapa per-potong (chunk) dan bukan satu kali jalan penuh:
 *   satu SERP run saja bisa 15–30 detik; 104 run dalam satu request HTTP itu
 *   resep timeout. Cron memanggil route ini berkali-kali, tiap panggilan
 *   mengerjakan `limit` tugas yang BELUM punya file hasil, lalu berhenti.
 *   Karena idempoten (file sudah ada = dilewati), cron dobel tidak dobel-bayar.
 *
 * Keamanan:
 *   - wajib CRON_SECRET di .env.local; route menolak semua kalau tidak di-set
 *   - semua endpoint lewat ALLOWLIST di lib/monid.ts
 *   - pagu per-proses di BUDGET.totalUsd (default $2) mematikan sendiri
 *
 * Hasil ditulis ke .study/seo/{geo,serp}/NNN.json + manifest.json — format yang
 * sama persis dengan scripts/seo-batch.mjs, sehingga lib/seo/store.ts tidak
 * peduli siapa yang menulisnya, dan halaman ter-update tanpa build ulang.
 *
 * Crontab yang disarankan (Senin pagi, tiap 10 menit — menit 0,10,20,30,40,50):
 *   0,10,20,30,40,50 3 * * 1  curl -fsS "https://<domain>/api/cron/seo?probe=geo&limit=8&secret=$CRON_SECRET"
 *   0,10,20,30,40,50 4 * * 1  curl -fsS "https://<domain>/api/cron/seo?probe=serp&limit=8&secret=$CRON_SECRET"
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { monid, MonidError, ProviderError, BlockedError, spend, BUDGET } from "@/lib/monid";
import queries from "@/lib/seo/queries.json";

export const dynamic = "force-dynamic";

const STUDY = join(process.cwd(), ".study", "seo");

const ENDPOINTS = {
  geo: { provider: "dataforseo", endpoint: "/ai/chatgpt-response" },
  serp: { provider: "dataforseo", endpoint: "/serp/google-organic" },
} as const;

type Probe = keyof typeof ENDPOINTS;

const inputFor = (probe: Probe, query: string): Record<string, unknown> =>
  probe === "geo"
    ? { user_prompt: query, model_name: "gpt-4o-mini", max_output_tokens: 700 }
    : { keyword: query, location_name: "Indonesia", language_name: "Indonesian", depth: 10 };

const outFile = (probe: Probe, index: number) =>
  join(STUDY, probe, `${String(index).padStart(3, "0")}.json`);

type Manifest = {
  startedAt?: string;
  finishedAt?: string;
  spent?: number;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  okCount?: number;
  failCount?: number;
  results?: Record<string, { query: string; cost: number; ok: boolean; error?: string | null }>;
};

function loadManifest(): Manifest {
  try {
    return JSON.parse(readFileSync(join(STUDY, "manifest.json"), "utf8")) as Manifest;
  } catch {
    return { results: {} };
  }
}

function saveManifest(m: Manifest) {
  mkdirSync(STUDY, { recursive: true });
  writeFileSync(join(STUDY, "manifest.json"), JSON.stringify(m, null, 2));
}

/** Kunci antrean: indeks yang belum punya file hasil. */
function pending(probe: Probe, limit: number): { index: number; query: string }[] {
  const list = queries[probe];
  const out: { index: number; query: string }[] = [];
  for (let i = 0; i < list.length && out.length < limit; i++) {
    if (!existsSync(outFile(probe, i))) out.push({ index: i, query: list[i] });
  }
  return out;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const envSecret = process.env.CRON_SECRET;

  if (!envSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET belum di-set di .env.local — route dimatikan" },
      { status: 503 },
    );
  }
  if (secret !== envSecret) {
    return NextResponse.json({ error: "secret salah" }, { status: 401 });
  }

  const probe = (url.searchParams.get("probe") ?? "geo") as Probe;
  if (!(probe in ENDPOINTS)) {
    return NextResponse.json({ error: `probe tidak dikenal: ${probe}` }, { status: 400 });
  }
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 8), 25));

  mkdirSync(join(STUDY, probe), { recursive: true });
  const queue = pending(probe, limit);
  const manifest = loadManifest();
  manifest.startedAt ??= new Date().toISOString();

  if (queue.length === 0) {
    return NextResponse.json({ probe, queued: 0, done: true, spent: spend().total });
  }

  const { provider, endpoint } = ENDPOINTS[probe];
  let ok = 0;
  let failed = 0;

  // Paralel kecil — 4 di dalam satu proses cukup untuk potongan 8 tugas.
  const worker = async () => {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      if (spend().total >= BUDGET.totalUsd) {
        failed++;
        continue;
      }
      try {
        const res = await monid.run(provider, endpoint, inputFor(probe, job.query));
        writeFileSync(outFile(probe, job.index), JSON.stringify(res.output ?? []));
        const key = `${probe}/${job.index}`;
        manifest.results = { ...manifest.results, [key]: { query: job.query, cost: res.cost, ok: true } };
        ok++;
      } catch (err) {
        const key = `${probe}/${job.index}`;
        const message =
          err instanceof ProviderError
            ? `provider ${err.providerStatus}`
            : err instanceof BlockedError
              ? "blocked oleh control gate Monid"
              : err instanceof MonidError
                ? `${err.code}: ${err.message}`
                : String(err);
        // Provider error TIDAK ditulis sebagai hasil — biar dicoba lagi
        // panggilan cron berikutnya. Hanya error lokal yang dicatat.
        manifest.results = { ...manifest.results, [key]: { query: job.query, cost: 0, ok: false, error: message } };
        failed++;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));

  manifest.spent = Number(spend().total.toFixed(6));
  manifest.okCount = (manifest.okCount ?? 0) + ok;
  manifest.failCount = (manifest.failCount ?? 0) + failed;
  manifest.finishedAt = new Date().toISOString();
  saveManifest(manifest);

  const remaining = queries[probe].length - (manifest.okCount ?? 0);

  return NextResponse.json({
    probe,
    processed: queue.length,
    ok,
    failed,
    spentInProcess: Number(spend().total.toFixed(6)),
    budgetPerProcess: BUDGET.totalUsd,
    remainingApprox: Math.max(0, remaining),
    note: "file hasil ditulis ke .study/seo — /seo-lab ter-update pada revalidate berikutnya",
  });
}
