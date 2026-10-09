"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Collapses the CSS-only menus when the route changes.
 *
 * The header's mobile panel and the footer's "Information" list are native
 * `<details>` elements, which have no router awareness: the App Router keeps
 * the layout mounted across a client-side navigation, so tapping a link left
 * the panel open on top of the page the reader had just asked for. Empty
 * `<details>` elements in the document are closed here.
 *
 * Deliberately a null-rendering sibling rather than a hook inside the header:
 * it keeps `SiteHeader`/`SiteFooter` as server components, so none of the
 * header's markup ships as client JS.
 */
export function CloseMenusOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll("details[open]").forEach((el) => {
      el.removeAttribute("open");
    });
  }, [pathname]);

  return null;
}