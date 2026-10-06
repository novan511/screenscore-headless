"use client";

import { useEffect } from "react";
import { ADSENSE } from "@/lib/config";

/**
 * One Google AdSense unit, tagged exactly like the legacy theme does:
 * `<ins class="adsbygoogle">` + a `push({})` once it is on the page.
 *
 * The push runs in an effect (after hydration) so the loader script added in
 * the root layout has had a chance to define `window.adsbygoogle`. A missing
 * script — ad blocker, offline, first paint — must never break the page, so
 * the push is wrapped: AdSense failures are silent by design.
 *
 * `slot` is one of `ADSENSE.slots`. `label` is the widget name the WordPress
 * theme used for the same placement (`Screenscore_top_product`, …); it ships
 * as a `data-widget` attribute so a rendered page can still be compared
 * against the legacy markup.
 */
export function AdSlot({
  slot,
  label,
  className = "",
}: {
  slot: string;
  label: string;
  className?: string;
}) {
  useEffect(() => {
    try {
      ((window as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      /* ad blocker / script not loaded — the slot simply stays empty */
    }
  }, []);

  return (
    <div className={`ad-slot ${className}`.trim()} data-widget={label}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE.client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
