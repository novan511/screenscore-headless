#!/usr/bin/env node
/**
 * Batch pertama / batch mingguan probe SEO & GEO ScreenScore.
 *
 * Menjalankan dua probe lewat CLI Monid (bukan HTTP langsung) supaya API key
 * tidak pernah ada di dalam skrip:
 *
 *   GEO  dataforseo#/ai/chatgpt-response   $0,0006 + token terpakai
 *   SERP dataforseo#/serp/google-organic   $0,002  per halaman 10 hasil
 *
 * Keamanan biaya:
 *   - ada pagu (--budget, default $0,60); begitu pagu tersentuh, tugas yang
 *     belum berjalan dibatalkan, yang sedang berjalan dibiarkan selesai
 *   - 1 query per run, tanpa array multi-query (jebakan biaya #1 di Monid)
 *   - depth SERP 1 = 1 halaman = 1x bayar
 *
 * Hasil mentah ditulis ke .study/seo/{geo,serp}/NNN.json + manifest.json
 * (.study/ di-gitignore). Sumber kebenaran untuk lib/seo/real.ts.
 *
 * Pemakaian:
 *   node scripts/seo-batch.mjs                 # batch penuh
 *   node scripts/geo-batch  --probe serp --limit 10 --concurrency 4
 *   node scripts/seo-batch.mjs --dry-run       # tanpa menjalankan apa pun
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".study", "seo");
const QUERIES = JSON.parse(readFileSync(join(ROOT, "lib", "seo", "queries.json"), "utf8"));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const CONFIG = {
  probe: flag("probe", "all"), // geo | serp | all
  limit: Number(flag("limit", "0")), // 0 = semua
  concurrency: Number(flag("concurrency", "6")),
  budget: Number(flag("budget", "0.60")), // pagu USD
  dryRun: args.includes("--dry-run"),
};

/** Harga per run — diverifikasi lewat `monid inspect` (lihat .study/monid-phase0.json). */
const PRICE = {
  geo: { perCall: 0.0006, tokenField: "money_spent" },
  serp: { perCall: 0.002, tokenField: null },
};

const ENDPOINT = {
  geo: { provider: "dataforseo", endpoint: "/ai/chatgpt-response" },
  serp: { provider: "dataforseo", endpoint: "/serp/google-organic" },
};

const input = (probe, query) =>
  probe === "geo"
    ? { user_prompt: query, model_name: "gpt-4o-mini", max_output_tokens: 700 }
    : { keyword: query, location_name: "Indonesia", language_name: "Indonesian", depth: 10 };

/** Jalankan satu run. Mengembalikan { ok, cost, runId, error }. */
async function runOne(probe, index, query) {
  const dir = join(OUT, probe);
  const file = join(dir, `${String(index).padStart(3, "0")}.json`);
  if (existsSync(file)) return { ok: true, skipped: true, cost: 0, file };

  const { provider, endpoint } = ENDPOINT[probe];
  const argv = [
    "run", "-p", provider, "-e", endpoint,
    "-i", JSON.stringify(input(probe, query)),
    "-w", "100", "-o", file,
  ];

  try {
    const { stdout = "", stderr = "" } = await execFileAsync("monid", argv, {
      env: { ...process.env, NO_COLOR: "1" },
      timeout: 140_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    if (!existsSync(file)) {
      const runId = /runs get -r (\w+)/.exec(stdout + stderr)?.[1];
      return { ok: false, runId, error: "output tidak tertulis" };
    }
    // Hitung biaya dari isi output (lebih akurat daripada harga daftar).
    let cost = PRICE[probe].perCall;
    try {
      const data = JSON.parse(readFileSync(file, "utf8"));
      const first = Array.isArray(data) ? data[0] : data;
      const token = PRICE[probe].tokenField && first?.[PRICE[probe].tokenField];
      if (typeof token === "number") cost += token;
    } catch {
      /* output non-JSON tetap dihitung harga dasar */
    }
    return { ok: true, cost, file };
  } catch (err) {
    return { ok: false, error: String(err?.stderr || err?.message || err).slice(0, 300) };
  }
}

async function monidBalance() {
  try {
    const { stdout } = await execFileAsync("monid", ["balance"], {
      env: { ...process.env, NO_COLOR: "1" },
      timeout: 30_000,
    });
    return Number(/\$\s*([\d.]+)/.exec(stdout)?.[1] ?? NaN);
  } catch {
    return NaN;
  }
}

async function probe(probeName, queries, manifest, state) {
  const jobs = queries
    .map((query, index) => ({ probe: probeName, index, query }))
    .slice(0, CONFIG.limit || undefined);

  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      // Pagu: berhenti men dispatch, biarkan yang sedang jalan selesai.
      if (state.spent >= CONFIG.budget) {
        manifest.aborted = `pagu $${CONFIG.budget} tersentuh`;
        return;
      }
      const job = jobs[cursor++];
      const res = await runOne(job.probe, job.index, job.query);
      const key = `${job.probe}/${job.index}`;
      manifest.results[key] = {
        query: job.query,
        ok: res.ok,
        skipped: res.skipped || false,
        cost: Number((res.cost || 0).toFixed(6)),
        error: res.error || null,
        runId: res.runId || null,
      };
      if (res.ok) state.spent += res.cost || 0;
      state.done++;
      if (state.done % 10 === 0 || state.done === state.total) {
        process.stdout.write(
          `  ${String(state.done).padStart(3)}/${state.total}  ` +
            `terpakai $${state.spent.toFixed(4)} / $${CONFIG.budget}\n`,
        );
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONFIG.concurrency, jobs.length) }, worker));
}

async function main() {
  mkdirSync(join(OUT, "geo"), { recursive: true });
  mkdirSync(join(OUT, "serp"), { recursive: true });

  const before = await monidBalance();
  const probes = CONFIG.probe === "all" ? ["geo", "serp"] : [CONFIG.probe];
  const state = { spent: 0, done: 0, total: 0 };

  for (const p of probes) {
    const q = p === "geo" ? QUERIES.geo : QUERIES.serp;
    const visible = CONFIG.limit ? q.slice(0, CONFIG.limit) : q;
    state.total += visible.length;
  }

  console.log(`Batch SEO/GEO — probe=${CONFIG.probe} limit=${CONFIG.limit || "semua"} ` +
    `paralel=${CONFIG.concurrency} pagu=$${CONFIG.budget}`);
  console.log(`Saldo sebelum: $${Number.isNaN(before) ? "?" : before.toFixed(4)}`);

  if (CONFIG.dryRun) {
    for (const p of probes) {
      const q = p === "geo" ? QUERIES.geo : QUERIES.serp;
      console.log(`  ${p}: ${q.length} tugas — estimasi $${(q.length * PRICE[p].perCall).toFixed(4)}`);
    }
    return;
  }

  const startedAt = new Date().toISOString();
  // Merge dengan manifest lama — menjalankan ulang satu probe tidak boleh
  // menghapus catatan biaya probe lain.
  const previous = existsSync(join(OUT, "manifest.json"))
    ? JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8"))
    : {};
  const manifest = {
    ...previous,
    startedAt: previous.startedAt ?? startedAt,
    config: CONFIG,
    results: { ...(previous.results ?? {}) },
    aborted: null,
  };

  for (const p of probes) {
    console.log(`\n▶ probe ${p} (${(p === "geo" ? QUERIES.geo : QUERIES.serp).length} tugas)`);
    await probe(p, p === "geo" ? QUERIES.geo : QUERIES.serp, manifest, state);
  }

  const after = await monidBalance();
  manifest.finishedAt = new Date().toISOString();
  // Rekonsiliasi dari hasil tersimpan, bukan dari sesi berjalan saja —
  // supaya `spent` tetap benar walau satu probe dijalankan berkali-kali.
  const all = Object.values(manifest.results);
  manifest.spent = Number(all.reduce((s, r) => s + (r.cost || 0), 0).toFixed(6));
  manifest.balanceBefore = Number.isNaN(before) ? null : before;
  manifest.balanceAfter = Number.isNaN(after) ? null : after;
  manifest.okCount = all.filter((r) => r.ok).length;
  manifest.failCount = all.filter((r) => !r.ok).length;
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\nSelesai: ${manifest.okCount} ok, ${manifest.failCount} gagal`);
  console.log(`Terpakai: $${manifest.spent} · saldo $${manifest.balanceBefore} → $${manifest.balanceAfter}`);
  if (manifest.aborted) console.log(`⚠ ${manifest.aborted}`);
  console.log(`Manifest: .study/seo/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
