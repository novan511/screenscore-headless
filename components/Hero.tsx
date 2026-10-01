"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ScreenScore, Title } from "@/lib/types";
import { cx } from "@/lib/utils";

const AUTOPLAY_MS = 6500;
/** Horizontal pointer travel (px) before a swipe turns into a slide change. */
const SWIPE_THRESHOLD = 60;
/** Max drag feedback offset while the finger is down. */
const DRAG_CLAMP = 140;

/**
 * Home hero — the "sticker-book sunshine" stage, now a carousel of editor
 * picks: one slide at a time (single <h1>, SSR'd first slide), arrows + pill
 * dots, and the poster strip doubling as slide selectors. Autoplay pauses on
 * hover/focus and is skipped entirely under prefers-reduced-motion.
 */
export function Hero({
  featured,
  rest,
  scores,
}: {
  featured: Title;
  rest: Title[];
  scores: Record<string, ScreenScore | null>;
}) {
  const items = [featured, ...rest.filter((t) => t.slug !== featured.slug)];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (paused || items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % items.length),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(id);
  }, [paused, items.length, index]);

  const go = (delta: number) => {
    if (items.length < 2) return;
    setDir(delta > 0 ? "next" : "prev");
    setIndex((i) => (i + delta + items.length) % items.length);
  };

  /* iOS-style swipe: horizontal pointer travel turns into a slide change,
     while vertical scrolling keeps working (touch-action: pan-y). */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || items.length < 2) return;
    drag.current = { startX: e.clientX, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 6) d.moved = true;
    if (d.moved) setDragX(Math.max(-DRAG_CLAMP, Math.min(DRAG_CLAMP, dx)));
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragX(0);
    if (!d?.moved) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    // A drag must not fall through to the link under the finger.
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
      if (drag.current) drag.current.moved = false;
    }
  };

  const slide = items[index];
  const score = scores[slide.slug]?.score ?? null;
  const visual = slide.images[0]?.src ?? slide.images[1]?.src ?? "";

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-blush via-cream to-white"
      role="region"
      aria-roledescription="carousel"
      aria-label="Pilihan Editor"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
        }
      }}
    >
      {/* soft colour blobs — cheerful, never black */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-pink/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-yellow/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-sky/70 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14">
        <div
          key={index}
          className={cx("hero-slide", dir === "prev" ? "hero-slide-prev" : "hero-slide-next")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          style={{ touchAction: "pan-y" }}
        >
          <div
            style={{
              transform: dragX ? `translateX(${dragX}px)` : undefined,
              transition: dragX ? "none" : undefined,
            }}
          >
            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <span className="rounded-full bg-pink px-3 py-1.5 text-white">
                  ⭐ Pilihan Editor
                </span>
                {slide.categories[0] && (
                  <span className="rounded-full border border-line bg-white px-3 py-1.5 text-ink">
                    {slide.categories[0].name}
                  </span>
                )}
                {slide.ageRating && (
                  <span className="rounded-full bg-yellow px-3 py-1.5 text-ink">
                    👶 {slide.ageRating}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-5xl">
                {slide.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {slide.year && (
                  <span className="font-semibold text-muted">{slide.year}</span>
                )}
                {score != null && (
                  <span className="flex items-center gap-1.5 rounded-full bg-yellow px-3 py-1 font-extrabold tabular text-ink">
                    {score.toFixed(1)} <span aria-hidden>★</span>
                  </span>
                )}
                {slide.averageRating > 0 && (
                  <span className="font-semibold text-ink/75">
                    ★ {slide.averageRating.toFixed(1)} dari{" "}
                    {slide.reviewCount} review
                  </span>
                )}
              </div>

              {slide.excerpt && (
                <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base">
                  {slide.excerpt}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={`/content/${slide.slug}`}
                  className="press inline-flex rounded-full bg-pink px-7 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgb(242_24_124/0.6)] hover:bg-pink-600"
                >
                  Lihat Review Lengkap
                </Link>
                <Link
                  href="/films"
                  className="press inline-flex rounded-full border border-line bg-white px-6 py-3 text-sm font-extrabold text-ink hover:border-pink hover:text-pink"
                >
                  Jelajahi Semua Film
                </Link>
              </div>
            </div>

            {/* the sticker: white-framed poster, slightly askew */}
            <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px] lg:max-w-none">
              <div className="relative rotate-2">
                <Link
                  href={`/content/${slide.slug}`}
                  className="relative block overflow-hidden rounded-2xl border-[6px] border-white bg-white shadow-[0_22px_50px_-20px_rgb(242_24_124/0.45)]"
                  style={{ aspectRatio: "2 / 3" }}
                >
                  {visual ? (
                    <Image
                      src={visual}
                      alt={slide.name}
                      fill
                      sizes="(min-width: 1024px) 320px, 300px"
                      quality={75}
                      className="object-cover"
                      priority={index === 0}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-cream text-5xl">
                      🎬
                    </div>
                  )}
                </Link>

                {score != null && (
                  <span className="absolute -right-4 -top-5 flex h-16 w-16 rotate-6 flex-col items-center justify-center rounded-full bg-yellow text-ink shadow-[0_8px_20px_-6px_rgb(23_20_26/0.35)] ring-4 ring-white">
                    <span className="text-lg font-extrabold leading-none tabular">
                      {score.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide">
                      Skor
                    </span>
                  </span>
                )}

                {slide.ageRating && (
                  <span className="absolute -left-4 bottom-6 -rotate-6 rounded-full bg-pink px-3 py-1.5 text-xs font-extrabold text-white shadow-md ring-4 ring-white">
                    {slide.ageRating}
                  </span>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {items.length > 1 && (
          <div className="mt-9 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Pilihan sebelumnya"
              className="press grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-pink shadow-sm hover:border-pink"
            >
              <Chevron dir="left" />
            </button>

            {/*
              A plain button group, not role="tablist": tabs require a
              `tabpanel` to control, and these slides are not panels — screen
              readers announce the current slide via aria-current instead.
            */}
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Pilih pilihan editor"
            >
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  aria-current={i === index}
                  aria-label={`Tampilkan ${it.name}`}
                  onClick={() => setIndex(i)}
                  /* A 12px dot is untappable on a phone. The padding keeps the
                     same 44px touch target while the inner dot stays the
                     original size, so the visual rail is unchanged. */
                  className="group grid h-11 w-6 place-items-center"
                >
                  <span
                    aria-hidden
                    className={cx(
                      "block h-3 rounded-full transition-all",
                      i === index
                        ? "w-7 bg-pink"
                        : "w-3 bg-pink/25 group-hover:bg-pink/50",
                    )}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Pilihan berikutnya"
              className="press grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-pink shadow-sm hover:border-pink"
            >
              <Chevron dir="right" />
            </button>
          </div>
        )}

        {/* poster strip — the slides' own thumbnails */}
        <div className="rail mt-8">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Pilih ${it.name}`}
              aria-current={i === index}
              className={cx(
                "group w-[132px] rounded-2xl border bg-white p-2 text-left transition",
                i === index
                  ? "border-pink shadow-[0_12px_28px_-16px_rgb(242_24_124/0.45)]"
                  : "border-line hover:border-pink/40",
              )}
            >
              <div
                className="relative overflow-hidden rounded-xl bg-surface"
                style={{ aspectRatio: "2 / 3" }}
              >
                {it.images[0] && (
                  <Image
                    src={it.images[0].src}
                    alt=""
                    fill
                    sizes="132px"
                    quality={70}
                    className={cx(
                      "object-cover transition",
                      i !== index && "opacity-80 group-hover:opacity-100",
                    )}
                  />
                )}
                {it.ageRating && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-pink px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {it.ageRating}
                  </span>
                )}
              </div>
              <p
                className={cx(
                  "mt-2 line-clamp-2 px-0.5 text-xs font-bold leading-snug",
                  i === index ? "text-pink" : "text-ink",
                )}
              >
                {it.name}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={dir === "left" ? "rotate-180" : undefined}
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
