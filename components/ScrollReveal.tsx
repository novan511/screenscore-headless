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
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const pending = Array.from(
      document.querySelectorAll<HTMLElement>("[ss-reveal]:not(.is-in)"),
    );
    if (!pending.length) return;

    const viewportH = window.innerHeight || 0;

    // Visible right now → settle immediately, no observer needed.
    const visible: HTMLElement[] = [];
    const hidden: HTMLElement[] = [];
    for (const el of pending) {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < viewportH * 0.98 && rect.bottom > 0;
      (inView ? visible : hidden).push(el);
      if (inView) el.classList.add("is-in");
    }

    // Hide only the rest — armed after the visible ones are already safe.
    document.documentElement.classList.add("ss-reveal-armed");

    if (!hidden.length) return;

    if (!("IntersectionObserver" in window)) {
      hidden.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    hidden.forEach((el) => observer.observe(el));

    // Never leave copy stuck invisible if the observer misbehaves.
    const failsafe = window.setTimeout(() => {
      hidden.forEach((el) => el.classList.add("is-in"));
    }, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [pathname]);

  return null;
}
