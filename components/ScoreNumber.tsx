"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts the score up when it scrolls into view.
 *
 * The server already renders the final number, so anything visible at load
 * keeps that value — the animation only ever runs for a box the reader has not
 * seen yet, which avoids a hydration flash of "0.0" → real score.
 */
export function ScoreNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen: leave the server-rendered value alone.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const duration = 800;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(value * eased);
          if (t < 1) frame = requestAnimationFrame(step);
        };
        // Start from zero only now that the box is actually arriving.
        setDisplay(0);
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{display.toFixed(1)}</span>;
}
