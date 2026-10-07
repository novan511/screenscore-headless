/**
 * Klien Monid untuk server (lib/monid.ts).
 *
 * Berbeda dengan skrip batch (scripts/seo-batch.mjs) yang memakai CLI, kode di
 * sini memanggil HTTP API langsung — karena itu kunci wajib ada di server:
 *
 *   .env.local →  MONID_API_KEY=monid_live_...     (gitignored, jangan pernah NEXT_PUBLIC_*)
 *
 * Tiga aturan yang tidak boleh dilanggar siapa pun yang memakai modul ini:
 *
 *  1. JANGAN dipanggil dari request path render halaman. `run` butuh 1–120
 *     detik + polling; yang boleh disentuh jalur request hanya discover/inspect
 *     (gratis), dan itupun sudah di-cache. Jalankan lewat cron saja.
 *  2. Selalu lewat ALLOWLIST. Endpoint dipilih oleh kode, bukan oleh string
 *     yang datang dari luar.
 *  3. Selalu ada pagu. Biaya diakumulasi di module state dan dibandingkan
 *     dengan budgetPerRun / budgetTotal sebelum tiap run.
 *
 * Pemakaian:
 *   import { monid } from "@/lib/monid";
 *   const r = await monid.discover("google serp results");
 *   const s = await monid.inspect("dataforseo", "/serp/google-organic");
 *   const out = await monid.run("dataforseo", "/serp/google-organic", { keyword: "..." });
 */

const BASE = "https://api.monid.ai";

/** Endpoint yang boleh dijalankan pipeline. Tambah di sini, bukan di pemanggil. */
export const ALLOWLIST = new Set([
  "dataforseo#/serp/google-organic",
  "dataforseo#/ai/chatgpt-response",
  "dataforseo#/ai/perplexity-response",
  "dataforseo#/ai/keyword-search-volume",
  "context.dev#/web/crawl",
]);

/** Pagu keras. Di luar ini semua run ditolak sebelum menyentuh Monid. */
export const BUDGET = {
  perRunUsd: 0.05, // satu run tidak boleh lebih dari ini
  totalUsd: Number(process.env.MONID_DAILY_BUDGET ?? 2), // per proses
};

export type Price = {
  type: string;
  amount?: { value: number; currency: string };
  flatFee?: { value: number; currency: string };
};

export type DiscoverResult = {
  provider: string;
  endpoint: string;
  description: string;
  score: number;
  price: Price;
  status?: string | null;
  p50?: number | null;
  verified: boolean;
};

export type RunResult = {
  runId: string;
  status: string;
  /** Output final dari provider; null kalau gagal. */
  output: unknown;
  /** HTTP asli provider (200 = ada data, 404 = tidak ketemu). */
  providerStatus: number;
  /** Biaya yang tercatat Monid untuk run ini (USD). */
  cost: number;
  price?: Price;
};

export class MonidError extends Error {
  constructor(
    message: string,
    readonly code: number | string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "MonidError";
  }
}

/** Provider menjawab error (404/429/500). Run tetap COMPLETED dan TIDAK dibayar. */
export class ProviderError extends MonidError {
  constructor(message: string, readonly providerStatus: number) {
    super(message, providerStatus);
    this.name = "ProviderError";
  }
}

/** Control gate Monid (WORKSPACE_BUDGET / WORKSPACE_RUN_CAP) menghentikan run. */
export class BlockedError extends MonidError {
  constructor(message: string, readonly controls: unknown) {
    super(message, "BLOCKED");
    this.name = "BlockedError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function apiKey(): string {
  const key = process.env.MONID_API_KEY;
  if (!key) throw new MonidError("MONID_API_KEY belum di-set di server", 401);
  return key;
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ data: T; status: number; requestId?: string }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
    cache: "no-store",
  });
  const requestId = res.headers.get("x-request-id") ?? undefined;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* body non-JSON diteruskan apa adanya */
  }
  if (!res.ok && res.status !== 202) {
    const msg = (body as { message?: string })?.message ?? text.slice(0, 200);
    throw new MonidError(`${res.status} ${path}: ${msg}`, res.status, requestId);
  }
  return { data: body as T, status: res.status, requestId };
}

/** Cache module-level: discover 1 jam, inspect 24 jam. Katalog jarang berubah. */
const cache = new Map<string, { at: number; ttl: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), ttl: ttlMs, value });
  return value;
}

const HOUR = 3_600_000;

/* ── pengukuran biaya internal ─────────────────────────────────────────── */
let spentUsd = 0;
const spendLog: { at: string; what: string; usd: number }[] = [];

export function spend(): { total: number; log: typeof spendLog } {
  return { total: spentUsd, log: spendLog };
}

function charge(what: string, usd: number) {
  spentUsd += usd;
  spendLog.push({ at: new Date().toISOString(), what, usd });
  if (spentUsd > BUDGET.totalUsd) {
    throw new MonidError(
      `Pagu proses $${BUDGET.totalUsd} tersentuh (terpakai $${spentUsd.toFixed(4)})`,
      "LOCAL_BUDGET",
    );
  }
}

/* ── API ───────────────────────────────────────────────────────────────── */

type RawDiscover = {
  results: Array<{
    provider: string;
    endpoint: string;
    description: string;
    score: number;
    price: Price;
    metrics?: { status?: string; runTimeMs?: { p50?: number } };
    tags?: string[];
  }>;
};

export const monid = {
  /** Cari endpoint dengan bahasa alami. GRATIS. */
  async discover(query: string, limit = 5): Promise<DiscoverResult[]> {
    return cached(`discover:${query}:${limit}`, HOUR, async () => {
      const { data } = await request<RawDiscover>("/v1/discover", {
        method: "POST",
        body: JSON.stringify({ query, limit }),
      });
      return (data.results ?? []).map((r) => ({
        provider: r.provider,
        endpoint: r.endpoint,
        description: r.description,
        score: r.score,
        price: r.price,
        status: r.metrics?.status ?? null,
        p50: r.metrics?.runTimeMs?.p50 ?? null,
        verified: (r.tags ?? []).includes("verified"),
      }));
    });
  },

  /** Ambil schema input sebuah endpoint. GRATIS — sumber kebenaran parameter. */
  async inspect(provider: string, endpoint: string): Promise<{
    input: Record<string, unknown>;
    price?: Price;
    required?: string[];
  }> {
    return cached(`inspect:${provider}#${endpoint}`, 24 * HOUR, async () => {
      const { data } = await request<{
        input?: { body?: { properties?: Record<string, unknown>; required?: string[] } };
        price?: Price;
      }>("/v1/inspect", {
        method: "POST",
        body: JSON.stringify({ provider, endpoint }),
      });
      return {
        input: (data.input?.body ?? {}) as Record<string, unknown>,
        required: data.input?.body?.required,
        price: data.price,
      };
    });
  },

  /**
   * Jalankan endpoint. Berbayar.
   * 200 → sinkron, langsung ada output. 202 → async, dipoll sampai terminal.
   */
  async run(
    provider: string,
    endpoint: string,
    input: Record<string, unknown>,
    opts: { pollMs?: number; maxWaitMs?: number } = {},
  ): Promise<RunResult> {
    const id = `${provider}#${endpoint}`;
    if (!ALLOWLIST.has(id)) {
      throw new MonidError(`Endpoint ${id} tidak ada di ALLOWLIST`, "NOT_ALLOWLISTED");
    }

    // Perkiraan kasar dari harga daftar; biaya final dibaca dari respons run.
    const preview = await this.inspect(provider, endpoint).catch(() => null);
    const listed = preview?.price?.amount?.value ?? 0;
    if (listed > BUDGET.perRunUsd) {
      throw new MonidError(
        `${id} berdaftar $${listed} > pagu per-run $${BUDGET.perRunUsd}`,
        "OVER_PER_RUN_BUDGET",
      );
    }

    const { data, status } = await request<{
      runId: string;
      status: string;
      price?: Price;
      output?: unknown;
      providerResponse?: { httpStatus?: number };
      billing?: { reportedCost?: { value: number; unit?: string } };
      hints?: Record<string, string>;
    }>("/v1/run", {
      method: "POST",
      body: JSON.stringify({ provider, endpoint, input }),
      timeoutMs: 60_000,
    });

    let body = data;
    let httpStatus = status;

    if (httpStatus === 202) {
      body = await this.pollRun(data.runId, opts);
      httpStatus = body.providerResponse?.httpStatus ?? 200;
    }

    if (body.status === "BLOCKED") {
      throw new BlockedError(`Run ${body.runId} diblokir control gate`, (body as never as { controls?: unknown }).controls);
    }
    if (body.status !== "COMPLETED") {
      throw new MonidError(`Run ${body.runId} berstatus ${body.status}`, body.status);
    }

    const cost =
      typeof body.billing?.reportedCost?.value === "number" &&
      body.billing.reportedCost.unit === "MICRO_DOLLAR"
        ? body.billing.reportedCost.value / 1_000_000
        : (body.price?.amount?.value ?? listed);

    if (httpStatus >= 400) {
      // Provider error: run selesai, tidak dibayar, bukan kegagalan infra kita.
      throw new ProviderError(
        `Provider menjawab ${httpStatus} untuk ${id}`,
        httpStatus,
      );
    }

    charge(id, cost);
    return {
      runId: body.runId,
      status: body.status,
      output: body.output,
      providerStatus: httpStatus,
      cost,
      price: body.price,
    };
  },

  /** Poll sampai status terminal. Run async biasanya 1–120 detik. */
  async pollRun(
    runId: string,
    opts: { pollMs?: number; maxWaitMs?: number } = {},
  ): Promise<{
    runId: string;
    status: string;
    output?: unknown;
    providerResponse?: { httpStatus?: number };
    billing?: { reportedCost?: { value: number; unit?: string } };
    price?: Price;
  }> {
    const pollMs = opts.pollMs ?? 3_000;
    const maxWaitMs = opts.maxWaitMs ?? 130_000;
    const deadline = Date.now() + maxWaitMs;
    let wait = pollMs;

    while (Date.now() < deadline) {
      const { data } = await request<{
        runId: string;
        status: string;
        output?: unknown;
        providerResponse?: { httpStatus?: number };
        billing?: { reportedCost?: { value: number; unit?: string } };
        price?: Price;
      }>(`/v1/runs/${runId}`);
      const terminal = ["COMPLETED", "FAILED", "BLOCKED", "STOPPED", "TIMED_OUT"];
      if (terminal.includes(data.status)) return data;
      await sleep(wait);
      wait = Math.min(wait * 1.4, 10_000);
    }
    throw new MonidError(`Run ${runId} belum terminal dalam ${maxWaitMs}ms`, "POLL_TIMEOUT");
  },

  /** Saldo wallet — dipakai rekonsiliasi mingguan. */
  async balance(): Promise<number> {
    const { data } = await request<{ balance?: { amount?: number } }>("/v1/wallet/balance");
    return data.balance?.amount ?? 0;
  },
};
