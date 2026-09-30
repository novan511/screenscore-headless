import { NextRequest, NextResponse } from "next/server";
import { isUpstreamError } from "@/lib/http";
import { fetchReviewGate, submitReview } from "@/lib/reviews";

/**
 * Same-origin proxy for the reviewflow admin-ajax flow.
 *
 * WordPress nonces and auth cookies are same-origin by design — the browser
 * can only use them once this frontend takes over the site domain, so every
 * request's Cookie header is forwarded server-side to render the gate and to
 * submit exactly as the logged-in member.
 */

const SLUG_RE = /^[a-z0-9-]+$/i;
const RATING_RE = /^ratings\[[a-z0-9_-]+\]$/i;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { loggedIn: false, alreadyReviewed: false, fields: [] },
      { status: 400 },
    );
  }

  try {
    const gate = await fetchReviewGate(slug, request.headers.get("cookie"));
    // The nonce stays server-side; the client only needs state + field names.
    return NextResponse.json({
      loggedIn: gate.loggedIn,
      alreadyReviewed: gate.alreadyReviewed,
      fields: gate.fields,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }

  const slug = String(form.get("slug") ?? "");
  const postId = Number(form.get("post_id"));
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();

  if (!SLUG_RE.test(slug) || !Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 400 },
    );
  }
  if (!title || !content || title.length > 300 || content.length > 20_000) {
    return NextResponse.json(
      { success: false, message: "Judul dan isi review wajib diisi." },
      { status: 400 },
    );
  }

  const ratings: Record<string, number> = {};
  for (const [key, value] of form.entries()) {
    if (!RATING_RE.test(key)) continue;
    const stars = Number(value);
    if (Number.isInteger(stars) && stars >= 0 && stars <= 5) {
      ratings[key] = stars;
    }
  }

  try {
    const result = await submitReview(slug, postId, request.headers.get("cookie"), {
      title,
      content,
      ratings,
    });
    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  const upstream = isUpstreamError(err);
  return NextResponse.json(
    {
      success: false,
      message: upstream
        ? "WordPress sedang tidak terjangkau. Coba lagi sebentar lagi."
        : "Terjadi kesalahan. Silakan coba lagi.",
    },
    { status: upstream ? 502 : 500 },
  );
}
