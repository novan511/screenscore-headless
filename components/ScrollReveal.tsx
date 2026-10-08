"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * Arms the scroll-reveal for every `[ss-reveal]` element on the page.
 *
 * Server components only add the attribute, so all copy stays server-rendered
 * and a browser without JavaScript never hides anything.
 *
 * Runs in a layout effect: everything already in view is marked visible in the
 * same synchronous pass that turns hiding on, so the reader never sees an
 * empty section waiting for hydration.
 *
 * Reveal state travels in a `data-ss-reveal` attribute instead of an
 * `is-in`/`instant` class. This layout effect runs as soon as the shell
 * hydrates, but streamed Suspense boundaries hydrate *later* — mutating
 * `className` on a not-yet-hydrated node makes React report a hydration
 * mismatch ("server rendered HTML didn't match the client properties"),
 * because `className` is a prop React re-checks while hydrating. React never
 * renders `data-ss-reveal`, so it never compares it and the attribute is safe
 * to set before (or after) hydration.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const pending = Array.from(
      document.querySelectorAll<HTMLElement>("[ss-reveal]:not([data-ss-reveal])"),
    );
    if (!pending.length) return;

    const viewportH = window.innerHeight || 0;

    // Visible right now → settle immediately, no observer needed. The
    // `instant` state keeps ScrollReveal from *replaying* the entrance
    // animation at hydration: these were already painted, and fading them
    // 1 → 0 → 1 again pushed the LCP element's render delay by ~2.3s in the
    // production audit (everything above the fold blinked back in when the
    // observer armed).
    const visible: HTMLElement[] = [];
    const hidden: HTMLElement[] = [];
    for (const el of pending) {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < viewportH * 0.98 && rect.bottom > 0;
      (inView ? visible : hidden).push(el);
      if (inView) el.setAttribute("data-ss-reveal", "instant");
    }

    // Hide only the rest — armed after the visible ones are already safe.
    document.documentElement.classList.add("ss-reveal-armed");

    if (!hidden.length) return;

    if (!("IntersectionObserver" in window)) {
      hidden.forEach((el) => el.setAttribute("data-ss-reveal", "in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-ss-reveal", "in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    hidden.forEach((el) => observer.observe(el));

    // Never leave copy stuck invisible if the observer misbehaves.
    const failsafe = window.setTimeout(() => {
      hidden.forEach((el) => el.setAttribute("data-ss-reveal", "in"));
    }, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [pathname]);

  return null;
}
