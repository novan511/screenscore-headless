"use client";

import { useEffect, useRef, useState } from "react";
import { PosterCard } from "./PosterCard";
import type { TitleCard } from "@/lib/types";

/**
 * Looping poster carousel — the legacy site's Elementor `loop-carousel`
 * widget, rebuilt without pulling in a carousel runtime:
 *
 * - **Layout**: a fixed slide count per breakpoint (`cols`), 10px gutters,
 *   hidden scrollbar and `x` snapping. The slide maths lives in `.ss-slider`
 *   in `globals.css`; this component only measures the resulting step so it
 *   knows where to scroll.
 * - **Infinite**: when there are more items than fit on the widest
 *   breakpoint, the item list is rendered twice — wrapping around is then a
 *   jump between two identical positions instead of a visible rewind. The
 *   duplicate half is `inert` + `aria-hidden`, so it never reaches the tab
 *   order or the accessibility tree.
 * - **Autoplay** (`autoplay`): one card every 3s with a 500ms transition,
 *   matching the widget's `autoplay_speed` / `speed`. Hovering or focusing
 *   the row pauses it (`pause_on_interaction`), and reduced-motion users get
 *   no autoplay at all.
 * - **Mouse drag**: touch scrolls the row natively (momentum included), but
 *   a desktop cursor has no native equivalent — the legacy widget gets it
 *   from Swiper's `simulateTouch`. Here a window-level pointer session drives
 *   `scrollLeft` by hand, suspends the CSS snap while held (`.ss-dragging`),
 *   and swallows the click that follows so releasing over a card never
 *   navigates.
 */

const AUTOPLAY_MS = 3000;
/** Comfortably covers a 500ms smooth scroll before any corrective snap. */
const SETTLE_MS = 650;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Cols = {
  /** Slides per row above 1024px — the widget's `slides_to_show`. */
  desktop: number;
  /** 768–1024px — `slides_to_show_tablet`. */
  tablet: number;
  /** Below 768px — `slides_to_show_mobile`. */
  mobile: number;
};

export function PosterSlider({
  items,
  cols,
  label,
  autoplay = false,
}: {
  items: TitleCard[];
  cols: Cols;
  /** Accessible name for the carousel region. */
  label: string;
  autoplay?: boolean;
}) {
  const count = items.length;
  /* A loop only reads as seamless while at least one card stays off-screen. */
  const loop = count > cols.desktop;
  const slides = loop ? [...items, ...items] : items;

  const viewport = useRef<HTMLDivElement>(null);
  const nodes = useRef<Array<HTMLDivElement | null>>([]);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Programmatic scrolling owns the scroller until this timestamp. */
  const ownedUntil = useRef(0);
  /** Live mouse-drag session: which pointer, and where the last move was. */
  const drag = useRef({ id: -1, lastX: 0, active: false });
  /** Tears down the window listeners of the current drag session. */
  const dragCleanup = useRef<(() => void) | null>(null);
  /** A drag must never end in a click on the card under the cursor. */
  const suppressClick = useRef(false);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [dragging, setDragging] = useState(false);

  /** Distance between two slide origins — one card plus one gutter. */
  const step = () => {
    const first = nodes.current[0];
    const second = nodes.current[1];
    return first && second ? second.offsetLeft - first.offsetLeft : 0;
  };

  const moveTo = (target: number, smooth: boolean) => {
    const el = nodes.current[target];
    const sc = viewport.current;
    if (!el || !sc) return;
    const animate = smooth && !reducedMotion();
    ownedUntil.current = Date.now() + (animate ? SETTLE_MS : 200);
    sc.scrollTo({ left: el.offsetLeft, behavior: animate ? "smooth" : "auto" });
  };

  /**
   * A wrap leaves the scroller parked on a clone for one animation. Calling
   * this first snaps straight to the equivalent original position, so a
   * second command can never be issued against a half-finished wrap.
   */
  const flushSnap = () => {
    if (!snapTimer.current) return;
    clearTimeout(snapTimer.current);
    snapTimer.current = null;
    const sc = viewport.current;
    const unit = step();
    if (!sc || !unit) return;
    ownedUntil.current = Date.now() + 200;
    sc.scrollTo({ left: Math.min(index, count - 1) * unit, behavior: "auto" });
  };

  const go = (delta: 1 | -1) => {
    if (!count) return;
    flushSnap();

    if (!loop) {
      /* Plain bounded scroll — nothing to wrap around. */
      const sc = viewport.current;
      const unit = step();
      if (!sc || !unit) return;
      const target = Math.min(
        Math.max(sc.scrollLeft + delta * unit, 0),
        (count - 1) * unit,
      );
      ownedUntil.current = Date.now() + SETTLE_MS;
      sc.scrollTo({
        left: target,
        behavior: reducedMotion() ? "auto" : "smooth",
      });
      setIndex(Math.round(target / unit));
      return;
    }

    if (delta > 0) {
      const next = index + 1;
      if (next < count) {
        moveTo(next, true);
        setIndex(next);
        return;
      }
      /* Wrap forward onto the clone of slide 0, then rewind off-screen —
         both positions show exactly the same cards. */
      moveTo(count, true);
      setIndex(0);
      snapTimer.current = setTimeout(() => {
        const sc = viewport.current;
        if (!sc) return;
        ownedUntil.current = Date.now() + 200;
        sc.scrollTo({ left: 0, behavior: "auto" });
      }, SETTLE_MS);
      return;
    }

    if (index > 0) {
      moveTo(index - 1, true);
      setIndex(index - 1);
      return;
    }
    /* Wrap backwards: jump onto the clone first (identical view), then slide
       one card left onto the last original slide. */
    moveTo(count, false);
    snapTimer.current = setTimeout(() => moveTo(count - 1, true), 60);
    setIndex(count - 1);
  };

  /* Keep the latest `go` in a ref so the autoplay timer never closes over a
     stale index (it is re-created on every index change anyway). */
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });

  /** Distance the mouse must travel before a press counts as a drag. */
  const DRAG_THRESHOLD = 4;

  /**
   * Arm a window-level drag session on mouse press.
   *
   * The listeners live on `window` rather than as pointer capture on the
   * slider so a plain press-release keeps its native click on the card;
   * only once the threshold is crossed does the gesture take over the
   * scroller (snap parked, autoplay killed, the trailing click eaten).
   */
  const armDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const sc = viewport.current;
    if (!sc) return;

    /* A press released outside the window never delivered its `pointerup`;
       tear the lost session down before starting a new one. */
    dragCleanup.current?.();
    sc.style.scrollSnapType = "";
    setDragging(false);
    suppressClick.current = false;

    drag.current = { id: e.pointerId, lastX: e.clientX, active: false };

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (ev.pointerId !== d.id) return;
      if (!d.active && Math.abs(ev.clientX - d.lastX) < DRAG_THRESHOLD) return;
      const s = viewport.current;
      if (!s) return;
      if (!d.active) {
        d.active = true;
        setDragging(true);
        setStopped(true);
        suppressClick.current = true;
        flushSnap();
        if (scrollTimer.current) {
          clearTimeout(scrollTimer.current);
          scrollTimer.current = null;
        }
        /* Mandatory snap would quantise every assignment to a slide origin —
           park it until the pointer is released. */
        s.style.scrollSnapType = "none";
        /* The first few pixels may already have opened a text selection. */
        window.getSelection()?.removeAllRanges();
      }
      /* Dragging content leftwards (cursor dx < 0) reveals what is right. */
      s.scrollLeft -= ev.clientX - d.lastX;
      d.lastX = ev.clientX;
      ownedUntil.current = Date.now() + 300;
    };

    const end = (ev: PointerEvent) => {
      const d = drag.current;
      if (ev.pointerId !== d.id) return;
      dragCleanup.current?.();
      dragCleanup.current = null;
      const wasActive = d.active;
      drag.current = { id: -1, lastX: 0, active: false };
      if (!wasActive) return;
      setDragging(false);
      const s = viewport.current;
      if (!s) return;
      s.style.scrollSnapType = "";
      const unit = step();
      if (!unit) return;
      /* Land on the slide nearest the release point. A release inside the
         clone half jumps to its identical original first, so the reposition
         is invisible; otherwise glide the last partial step. */
      let next = Math.round(s.scrollLeft / unit);
      const wrapped = loop && next >= count;
      if (wrapped) next -= count;
      next = Math.min(Math.max(next, 0), count - 1);
      ownedUntil.current = Date.now() + SETTLE_MS;
      s.scrollTo({
        left: next * unit,
        behavior: wrapped || reducedMotion() ? "auto" : "smooth",
      });
      setIndex(next);
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    dragCleanup.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  /** Post-drag clicks must not navigate to the card under the cursor. */
  const suppressDragClick = (e: React.MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      dragCleanup.current?.();
    },
    [],
  );

  /* Widgets re-compute their slide widths when the viewport changes, so the
     parked card has to be re-aligned or the row ends up mid-card. */
  useEffect(() => {
    const onResize = () => {
      const sc = viewport.current;
      const el = nodes.current[index];
      if (!sc || !el) return;
      ownedUntil.current = Date.now() + 200;
      sc.scrollTo({ left: el.offsetLeft, behavior: "auto" });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  useEffect(() => {
    if (!autoplay || !loop || paused || stopped) return;
    if (reducedMotion()) return;
    const id = setTimeout(() => goRef.current(1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [autoplay, loop, paused, stopped, index]);

  const handleScroll = () => {
    if (Date.now() < ownedUntil.current) {
      /* Keep ownership alive for as long as our own scroll keeps emitting —
         a mid-flight commit would otherwise cut a wrap animation short. */
      ownedUntil.current = Date.now() + 300;
      return;
    }
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const sc = viewport.current;
      const unit = step();
      if (!sc || !unit) return;
      /* Only re-sync the index — the autoplay run is ended by the pointer /
         wheel handlers above, so our own trailing snap can't kill it. */
      let next = Math.round(sc.scrollLeft / unit);
      if (loop && next >= count) {
        ownedUntil.current = Date.now() + 200;
        sc.scrollTo({ left: (next - count) * unit, behavior: "auto" });
        next -= count;
      }
      setIndex(Math.min(Math.max(next, 0), count - 1));
    }, 160);
  };

  const pause = () => setPaused(true);
  const resume = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setPaused(false);
    }
  };

  const press = (delta: 1 | -1) => {
    setStopped(true);
    go(delta);
  };

  if (!count) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="group/sl relative"
      onMouseEnter={pause}
      onMouseLeave={() => setPaused(false)}
      onFocus={pause}
      onBlur={resume}
    >
      <div
        ref={viewport}
        className={dragging ? "ss-slider ss-dragging" : "ss-slider"}
        onScroll={handleScroll}
        /* The slide maths in `globals.css` reads these: 5/2/2 for the head
           carousel, 4/2/1 for the "Top Picks" rows. */
        style={
          {
            "--ss-cols-mobile": String(cols.mobile),
            "--ss-cols-tablet": String(cols.tablet),
            "--ss-cols-desktop": String(cols.desktop),
          } as React.CSSProperties
        }
        /* Real gestures — not our own `scrollTo` — end the autoplay run;
           a mouse press additionally arms the window-level drag session. */
        onPointerDown={(e) => {
          setStopped(true);
          /* Every new press re-arms the click: only the drag that just ended
             (whose `pointerup` already fired) may still be owed a swallow. */
          suppressClick.current = false;
          armDrag(e);
        }}
        onClickCapture={suppressDragClick}
        /* Cards are wrapped in <img>s whose native drag ghost would take
           the gesture over before our threshold fires. */
        onDragStart={(e) => e.preventDefault()}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setStopped(true);
        }}
      >
        {/* No `ss-stagger` here on purpose: the cascade starts every slide at
            opacity 0, which held the above-the-fold cards out of the first
            paints — Lighthouse then fell back to the header logo as the LCP
            element (element render delay 2.3s in the production audit).
            Cards are visible from the first paint; rails/grids elsewhere
            keep their cascade. */}
        <div className="ss-track">
          {slides.map((title, i) => {
            const clone = loop && i >= count;
            return (
              <div
                key={`${title.id}-${clone ? "b" : "a"}`}
                ref={(el) => {
                  nodes.current[i] = el;
                }}
                className="ss-slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`${(i % count) + 1} dari ${count}`}
                aria-hidden={clone || undefined}
              >
                {/* the reference card: a white 4px box on the off-white field,
                    20px padding at every breakpoint like the legacy template */}
                <div
                  className="h-full rounded-[4px] bg-white p-5"
                  inert={clone || undefined}
                >
                  <PosterCard
                    title={title}
                    /*
                     * Carousels make the LCP candidate unpredictable: any
                     * initially-visible slide (and, after a few autoplay
                     * steps, any advanced slide) can be it. The head row
                     * eager-loads its six unique slides — slide 0 also gets
                     * the preload hint; rails only need their first card.
                     */
                    priority={autoplay && !clone && i === 0}
                    eager={!clone && (autoplay || i === 0)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The legacy widget ships without navigation; these only surface on
          hover/focus, so the resting look stays untouched. */}
      {(["prev", "next"] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => press(side === "prev" ? -1 : 1)}
          aria-label={`${side === "prev" ? "Sebelumnya" : "Berikutnya"} — ${label}`}
          className={[
            "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center",
            "rounded-full bg-white/95 text-ink opacity-0 ring-1 ring-line",
            "shadow-[0_4px_16px_rgba(33,33,33,0.16)] transition duration-200",
            "hover:text-pink-600 hover:ring-pink focus-visible:opacity-100",
            "group-hover/sl:opacity-100 sm:grid",
            side === "prev" ? "left-1.5" : "right-1.5",
          ].join(" ")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={side === "prev" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
          </svg>
        </button>
      ))}
    </div>
  );
}
