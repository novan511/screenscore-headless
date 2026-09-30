"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Replays a soft fade on every client-side navigation.
 *
 * The App Router keeps the layout mounted between routes, so without this the
 * new page content would swap in with no transition at all.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("page-enter");
    // Force a reflow so the animation restarts on the next navigation.
    void el.offsetWidth;
    el.classList.add("page-enter");
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}
