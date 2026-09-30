import { parse } from "node-html-parser";
import { cache } from "react";
import { WP_SITE } from "./config";
import { isUpstreamError, loadWpHtml } from "./http";
import { decodeEntities } from "./utils";
import type { PersonKind, ScreenScore, SeoMeta } from "./types";

/**
 * HTML bridge for data that WordPress does not expose headless yet:
 *  1. reviewflow editor scores (custom plugin, admin-ajax only)
 *  2. person biographies (Elementor text widgets, ACF not public)
 *  3. Yoast SEO metadata (wp/v2 takes 4–6s; the rendered page answers in ~200ms)
 *
 * We fetch the PHP-rendered page and parse it server-side under ISR.
 * Replace with a proper /wp-json/rf/v1 REST endpoint when available —
 * the return shapes here are already the contract the UI expects.
 */

/** Yoast metadata scraped from a rendered WordPress page. */
export const fetchTitleSeo = cache(
  async (permalink: string): Promise<SeoMeta | null> => {
    try {
      const html = await loadWpHtml(permalink);
      return html ? parseSeoFromHtml(html) : null;
    } catch {
      // SEO tags are additive — never fail the page over them.
      return null;
    }
  },
);

/** Yoast metadata for a static WordPress page (tentang-kami, contact, …). */
export const fetchPageSeo = cache(
  async (slug: string): Promise<SeoMeta | null> => {
    try {
      const html = await loadWpHtml(
        `${WP_SITE}/${slug.replace(/^\/+|\/+$/g, "")}/`,
      );
      if (!html) return null;
      return parseSeoFromHtml(html);
    } catch {
      return null;
    }
  },
);

function parseSeoFromHtml(html: string): SeoMeta | null {
  const root = parse(html);
  const attr = (selector: string) =>
    root.querySelector(selector)?.getAttribute("content")?.trim() ?? "";

  // Yoast often leaves <meta name="description"> empty and only fills
  // og:description — that is the copy actually worth shipping.
  const rawTitle = root.querySelector("title")?.text?.trim() ?? "";
  const rawDescription =
    attr('meta[name="description"]') || attr('meta[property="og:description"]');
  const image = attr('meta[property="og:image"]') || undefined;

  const title = decodeEntities(rawTitle);
  const description = decodeEntities(rawDescription);

  if (!title && !description) return null;
  return {
    title,
    description,
    ...(image && { image }),
  };
}

export async function fetchScreenScore(permalink: string): Promise<ScreenScore | null> {
  try {
    const html = await loadWpHtml(permalink);
    if (!html) return null;
    const root = parse(html);
    const card = root.querySelector(".reviewflow-container .rf-review-card");
    if (!card) return null;

    const scoreText = card.querySelector(".rf-review-card-rating")?.text?.trim();
    const score = scoreText ? Number(scoreText.replace(",", ".")) : null;

    const badge = card.querySelector(".rf-review-card-badge");
    const totalStars = badge
      ? badge.querySelectorAll(".rf-star.filled").length
      : Math.round(score ?? 0);

    const reviewHtml = card.querySelector(".rf-review-card-content")?.innerHTML?.trim() ?? "";
    const label = [
      card.querySelector(".rf-review-card-author")?.text?.trim(),
      card.querySelector(".rf-review-card-label")?.text?.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    const dimensions = card.querySelectorAll(".rf-review-card-rating-item").map((item) => ({
      label: item.querySelector(".rf-review-card-rating-label")?.text?.trim() ?? "",
      stars: item.querySelectorAll(".rf-star.filled").length,
    }));

    if (score === null && !reviewHtml) return null;

    return {
      score: Number.isFinite(score) ? score : null,
      stars: totalStars,
      label: label || "Screen Score Editor Review",
      review: reviewHtml,
      dimensions: dimensions.filter((d) => d.label),
    };
  } catch {
    return null;
  }
}

/** Biography pages: pull text out of Elementor text-editor widgets. */
export const fetchPersonBio = cache(async (
  kind: PersonKind,
  pathSlug: string,
): Promise<{ heading: string; bioHtml: string; seo: SeoMeta | null } | null> => {
  const base: Record<PersonKind, string> = {
    cast: "cast",
    creator: "creator",
    character: "character",
    song: "song",
    idol: "idol",
  };
  const url = `${WP_SITE}/${base[kind]}/${pathSlug.replace(/^\/+/, "")}/`;
  try {
    const html = await loadWpHtml(url);
    if (!html) return null;
    const root = parse(html);
    const heading = root.querySelector("h1")?.text?.trim() ?? "";
    const widgets = root.querySelectorAll(".elementor-widget-text-editor");
    const bioHtml = widgets
      .map((w) => w.querySelector(".elementor-widget-container")?.innerHTML ?? "")
      .filter((h) => h.trim().length > 40)
      .join("<br/>");
    const seo: SeoMeta = {
      title: root.querySelector("title")?.text?.trim() ?? heading,
      description:
        root
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ?? "",
    };
    if (!bioHtml && !heading) return null;
    return { heading, bioHtml, seo };
  } catch (err) {
    // Missing widget/ACF data is a normal "no bio yet" — an unreachable
    // WordPress is not, so let it surface as an error instead of a 404.
    if (isUpstreamError(err)) throw err;
    return null;
  }
});
