import { cache } from "react";
import { SITE } from "./config";

/**
 * Shared WordPress transport.
 *
 * WordPress sits behind Cloudflare and rate-limits bursts, so a single
 * request can legitimately come back 429/5xx or time out. The important
 * distinction this module enforces:
 *
 *   - upstream failure  -> throw  (page shows the error, ISR keeps the last good copy)
 *   - product not found -> null   (page renders a real 404)
 *
 * Conflating the two turned every transient hiccup into a cached 404, which
 * is exactly what made games look "not connected" to WordPress.
 */

/** Thrown when WordPress could not be reached at all. */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpstreamError";
  }
}

export function isUpstreamError(err: unknown): err is UpstreamError {
  return err instanceof UpstreamError;
}

/**
 * For optional/side results (search facets, related data): swallow errors that
 * mean "nothing matched", but let a dead backend propagate so the page shows
 * the error boundary instead of a confident-looking "0 results".
 */
export function ignoreMissing<T>(fallback: T): (err: unknown) => T {
  return (err: unknown): T => {
    if (isUpstreamError(err)) throw err;
    return fallback;
  };
}

const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 8_000;

/**
 * Cap concurrent WordPress requests process-wide. Next prerenders every
 * static page at once during `vercel build`, and the sitemap alone fans out
 * to ~9 parallel paginated readers — from a faraway build region that burst
 * trips Cloudflare rate-limiting (429s), and the retries then pile onto an
 * already-slow origin until everything times out and the build fails.
 * Four lanes stay comfortably under the limit while barely slowing a cold
 * render (homepage: ~14 reads ≈ 4 waves).
 */
const MAX_CONCURRENT = 4;
let inFlight = 0;
const waiters: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  inFlight++;
}

function releaseSlot(): void {
  inFlight--;
  waiters.shift()?.();
}

/**
 * 403 rides along with the 5xx set because the origin's WAF answers bursts
 * (and UA-less requests) with a plain "403 Forbidden" page for a while, then
 * lets the same request through. After the retries it still surfaces as an
 * UpstreamError, so ISR keeps serving the last good copy instead of caching
 * a confident failure.
 */
const RETRYABLE_STATUS = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

/**
 * Identify ourselves: undici sends no User-Agent by default, which some
 * WAFs treat as bot traffic. Callers can still override via init.headers.
 */
const DEFAULT_UA =
  "Mozilla/5.0 (compatible; ScreenScore/1.0; +https://screenscore.digitalmama.id)";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET a WordPress URL with retries and a hard timeout.
 * Returns the response for any non-retryable status (e.g. 400, 404) so the
 * caller can decide what it means; only persistent network/5xx failures throw.
 */
export async function wpFetch(
  url: string,
  options: { revalidate?: number; accept?: string; init?: RequestInit } = {},
): Promise<Response> {
  const { revalidate = SITE.revalidate, accept = "application/json", init } = options;

  let lastError: unknown;

  // Hold one lane for the whole attempt sequence (including backoff sleeps)
  // so retries cannot pile onto an already-saturated origin either.
  await acquireSlot();
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            Accept: accept,
            "User-Agent": DEFAULT_UA,
            ...init?.headers,
          },
          signal: init?.signal ?? AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
          next: { revalidate },
        });

        if (RETRYABLE_STATUS.has(res.status)) {
          lastError = new UpstreamError(`HTTP ${res.status} for ${url}`);
          // Nothing left to try — surface it instead of pretending the data is gone.
          if (attempt === MAX_ATTEMPTS) break;
        } else {
          return res;
        }
      } catch (err) {
        lastError = err;
        if (attempt === MAX_ATTEMPTS) break;
      }
      // Exponential-ish backoff: 250ms, 750ms — quick enough for a page render.
      await delay(250 * attempt * 3);
    }

    throw new UpstreamError(`WordPress unreachable: ${url}`, { cause: lastError });
  } finally {
    releaseSlot();
  }
}

/**
 * Build-phase-only fallback for upstream failures.
 *
 * Static pages are prerendered during `vercel build`; if WordPress blips in
 * that exact window the whole deployment fails. Catching *only* while
 * `NEXT_PHASE === "phase-production-build"` keeps the runtime contract
 * intact: real visitors still get the error boundary with retry, and ISR
 * still serves the last good copy — the degraded build output is replaced
 * at the first revalidation after WordPress recovers.
 *
 * Mirrors the `ignoreMissing` style: `.catch(catchUpstreamBuild(fallback))`.
 */
export function catchUpstreamBuild<T>(fallback: T): (err: unknown) => T {
  return (err: unknown): T => {
    if (
      isUpstreamError(err) &&
      process.env.NEXT_PHASE === "phase-production-build"
    ) {
      return fallback;
    }
    throw err;
  };
}

/**
 * Memoised HTML read: the SEO metadata and the Screen Score both need the
 * *same* WordPress page, so they share one download per request instead of
 * fetching the ~240KB document twice.
 */
export const loadWpHtml = cache((url: string): Promise<string | null> =>
  wpFetchHtml(url),
);

/**
 * Same transport for HTML pages scraped by the bridges (reviewflow scores,
 * Elementor bios). Returns null when the page simply does not exist so the
 * callers keep their "no data" behaviour, and throws only when WP is down.
 */
export async function wpFetchHtml(url: string): Promise<string | null> {
  const res = await wpFetch(url, { accept: "text/html" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new UpstreamError(`Unexpected HTML status ${res.status} for ${url}`);
  }
  return res.text();
}
