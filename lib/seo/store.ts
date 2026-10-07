/**
 * Buku catatan snapshot SEO/GEO — dibaca halaman, ditulis pipeline.
 *
 * Jalur datanya:
 *
 *   scripts/seo-batch.mjs  (atau cron berikutnya)
 *        → .study/seo/geo/NNN.json + .study/seo/serp/NNN.json + manifest.json
 *        → lib/seo/store.ts merangkumnya jadi Snapshot
 *        → app/seo-lab/page.tsx tinggal merender (server component, ISR)
 *
 * Sengaja membaca file saat runtime, bukan import statis: begitu cron selesai,
 * laporan ter-update tanpa perlu `next build` ulang. Kalau foldernya kosong
 * (fresh clone / belum pernah batch), jatuh balik ke benih di lib/seo/real.ts
 * supaya build tidak pernah gagal.
 *
 * Semua pembacaan di-cache Next lewat `revalidate` di halaman pemanggil.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import queries from "@/lib/seo/queries.json";
import { REAL } from "@/lib/seo/real";

const STUDY = join(process.cwd(), ".study", "seo");

export type GeoRowReal = {
  index: number;
  prompt: string;
  model: string;
  answer: string;
  mentionedUs: boolean;
  competitors: string[];
  webSearch: boolean;
  cost: number;
  ok: boolean;
};

export type SerpRowReal = {
  index: number;
  keyword: string;
  /** Posisi absolut kita; null = tidak masuk 10 besar. */
  rank: number | null;
  top: { rank: number | null; domain: string; title: string }[];
  aiOverview: { present: boolean; cited: string[] };
  peopleAlsoAsk: number;
  resultsCount: number;
  cost: number;
  ok: boolean;
};

export type Snapshot = {
  source: "live" | "seed";
  updatedAt: string | null;
  geo: {
    rows: GeoRowReal[];
    asked: number;
    mentioned: number;
    previous: number;
    spent: number;
    failed: number;
  };
  serp: {
    rows: SerpRowReal[];
    tracked: number;
    inTop10: number;
    withAiOverview: number;
    spent: number;
    failed: number;
  };
  budget: { spent: number; balance: number | null; ok: number; failed: number };
  catalog: typeof REAL.catalog;
};

type Manifest = {
  startedAt?: string;
  finishedAt?: string;
  spent?: number;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  okCount?: number;
  failCount?: number;
  results?: Record<string, { query?: string; cost?: number; ok?: boolean; error?: string | null }>;
};

const readJson = <T>(path: string): T | null => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
};

const listOf = (data: unknown): Record<string, unknown>[] =>
  Array.isArray(data) ? (data as Record<string, unknown>[]) : data ? [data as Record<string, unknown>] : [];

const textOf = (payload: Record<string, unknown>): string => {
  const items = Array.isArray(payload.items) ? (payload.items as Record<string, unknown>[]) : [];
  const parts: string[] = [];
  for (const item of items) {
    const sections = Array.isArray(item.sections) ? (item.sections as Record<string, unknown>[]) : [];
    for (const s of sections) if (typeof s.text === "string") parts.push(s.text);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
};

const mentions = (text: string, needle: string) =>
  text.toLowerCase().replaceAll("-", "").includes(needle.replaceAll("-", ""));

/** Teks jawaban → daftar domain/situs yang dikutip di dalamnya. */
function citedIn(text: string): string[] {
  const known = ["screenscore", "commonsensemedia", "imdb", "wikipedia", "haibunda", "sparks-edu", "telkomsel", "prenagen", "kompas", "kumparan"];
  return known.filter((k) => mentions(text, k) && k !== "screenscore");
}

/* ── perakit baris GEO ─────────────────────────────────────────────────── */
function buildGeo(index: number, manifest: Manifest): GeoRowReal | null {
  const raw = readJson<unknown>(join(STUDY, "geo", `${String(index).padStart(3, "0")}.json`));
  if (raw == null) return null;
  const payload = listOf(raw)[0];
  if (!payload) return null;

  const answer = textOf(payload);
  const meta = manifest.results?.[`geo/${index}`];
  // Fallback harga kalau manifest tidak punya catatan (mis. file diimpor
  // dari batch lama): $0,0006 per-call + token yang tercatat di output.
  const token = typeof payload.money_spent === "number" ? payload.money_spent : 0;
  const cost = meta?.cost && meta.cost > 0 ? meta.cost : 0.0006 + token;
  return {
    index,
    prompt: queries.geo[index] ?? (meta?.query ?? ""),
    model: typeof payload.model_name === "string" ? payload.model_name : "",
    answer,
    mentionedUs: mentions(answer, "screenscore"),
    competitors: citedIn(answer),
    webSearch: payload.web_search === true,
    cost,
    ok: meta?.ok ?? true,
  };
}

/* ── perakit baris SERP ────────────────────────────────────────────────── */
function buildSerp(index: number, manifest: Manifest): SerpRowReal | null {
  const raw = readJson<unknown>(join(STUDY, "serp", `${String(index).padStart(3, "0")}.json`));
  if (raw == null) return null;
  const doc = listOf(raw)[0];
  if (!doc) return null;

  const items = Array.isArray(doc.items) ? (doc.items as Record<string, unknown>[]) : [];
  const top: SerpRowReal["top"] = [];
  let rank: number | null = null;
  let paa = 0;
  let ai: SerpRowReal["aiOverview"] = { present: false, cited: [] };

  for (const it of items) {
    if (it.type === "organic") {
      const domain = String(it.domain ?? "");
      const entry = {
        rank: typeof it.rank_group === "number" ? it.rank_group : null,
        domain,
        title: String(it.title ?? ""),
      };
      top.push(entry);
      if (mentions(domain, "screenscore")) rank = entry.rank;
    } else if (it.type === "people_also_ask") {
      paa = Array.isArray(it.items) ? it.items.length : 0;
    } else if (it.type === "ai_overview" && !ai.present) {
      const md = String(it.markdown ?? "");
      const refs = Array.isArray(it.references) ? (it.references as Record<string, unknown>[]) : [];
      ai = {
        present: true,
        cited: [...new Set(refs.map((r) => String(r.domain ?? "")).filter(Boolean))],
      };
      if (mentions(md, "screenscore")) ai.cited = [...ai.cited, "screenscore.digitalmama.id"];
    }
  }

  const meta = manifest.results?.[`serp/${index}`];
  return {
    index,
    keyword: queries.serp[index] ?? (meta?.query ?? ""),
    rank,
    top: top.slice(0, 10),
    aiOverview: ai,
    peopleAlsoAsk: paa,
    resultsCount: typeof doc.se_results_count === "number" ? doc.se_results_count : 0,
    cost: meta?.cost && meta.cost > 0 ? meta.cost : 0.002,
    ok: meta?.ok ?? true,
  };
}

/**
 * Snapshot terkini. Panggil dari server component saja — membaca file disk.
 * Bentuk fallback (source: "seed") identik dengan lib/seo/real.ts.
 */
export function readSnapshot(): Snapshot {
  const manifest = readJson<Manifest>(join(STUDY, "manifest.json"));
  const geoDir = existsSync(join(STUDY, "geo")) ? readdirSync(join(STUDY, "geo")) : [];
  const serpDir = existsSync(join(STUDY, "serp")) ? readdirSync(join(STUDY, "serp")) : [];

  const geoRows = geoDir
    .filter((f) => f.endsWith(".json") && f !== "manifest.json")
    .map((f) => Number(f.replace(".json", "")))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((i) => buildGeo(i, manifest ?? {}))
    .filter((r): r is GeoRowReal => r !== null);

  const serpRows = serpDir
    .filter((f) => f.endsWith(".json"))
    .map((f) => Number(f.replace(".json", "")))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((i) => buildSerp(i, manifest ?? {}))
    .filter((r): r is SerpRowReal => r !== null);

  // Belum pernah batch → jatuh balik ke benih Fase 0.
  if (geoRows.length === 0 && serpRows.length === 0) {
    return {
      source: "seed",
      updatedAt: REAL.ranAt,
      geo: {
        rows: [
          {
            index: 0,
            prompt: REAL.geo.prompt,
            model: REAL.geo.model,
            answer: REAL.geo.answer,
            mentionedUs: REAL.geo.mentionedUs,
            competitors: REAL.geo.mentionedCompetitors,
            webSearch: REAL.geo.webSearch,
            cost: REAL.geo.tokenCost + 0.0006,
            ok: true,
          },
        ],
        asked: 1,
        mentioned: REAL.geo.mentionedUs ? 1 : 0,
        previous: 0,
        spent: REAL.geo.tokenCost + 0.0006,
        failed: 0,
      },
      serp: {
        rows: [
          {
            index: 0,
            keyword: REAL.serp.keyword,
            rank: REAL.serp.ourRank,
            top: REAL.serp.top.map((t) => ({ rank: t.rank, domain: t.domain, title: t.title })),
            aiOverview: {
              present: REAL.serp.aiOverview.present,
              cited: REAL.serp.aiOverview.cited.map((c) => c.domain),
            },
            peopleAlsoAsk: REAL.serp.peopleAlsoAsk,
            resultsCount: REAL.serp.resultsCount,
            cost: 0.002,
            ok: true,
          },
        ],
        tracked: 1,
        inTop10: REAL.serp.ourRank ? 1 : 0,
        withAiOverview: REAL.serp.aiOverview.present ? 1 : 0,
        spent: 0.002,
        failed: 0,
      },
      budget: { spent: REAL.spent, balance: REAL.balance, ok: 2, failed: 0 },
      catalog: REAL.catalog,
    };
  }

  const geoSpent = geoRows.reduce((s, r) => s + r.cost, 0);
  const serpSpent = serpRows.reduce((s, r) => s + r.cost, 0);

  return {
    source: "live",
    updatedAt: manifest?.finishedAt ?? manifest?.startedAt ?? null,
    geo: {
      rows: geoRows,
      asked: geoRows.length,
      mentioned: geoRows.filter((r) => r.mentionedUs).length,
      previous: REAL.geo.mentionedUs ? 1 : 0,
      spent: geoSpent,
      failed: geoRows.filter((r) => !r.ok).length,
    },
    serp: {
      rows: serpRows,
      tracked: serpRows.length,
      inTop10: serpRows.filter((r) => r.rank !== null).length,
      withAiOverview: serpRows.filter((r) => r.aiOverview.present).length,
      spent: serpSpent,
      failed: serpRows.filter((r) => !r.ok).length,
    },
    budget: {
      // Dihitung dari baris, bukan dari manifest — biar tetap akurat walau
      // manifest pernah ditimpa (cost per baris punya fallback harga).
      spent: geoSpent + serpSpent,
      balance: manifest?.balanceAfter ?? null,
      ok: geoRows.length + serpRows.length,
      failed: geoRows.filter((r) => !r.ok).length + serpRows.filter((r) => !r.ok).length,
    },
    catalog: REAL.catalog,
  };
}
