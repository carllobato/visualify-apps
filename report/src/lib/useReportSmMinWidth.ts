"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `sm` — same breakpoint as `sm:hidden` / `hidden sm:flex` in Report UI. */
export const REPORT_SM_MIN_WIDTH_PX = 640;

const REPORT_SM_MIN_WIDTH_QUERY = `(min-width: ${REPORT_SM_MIN_WIDTH_PX}px)`;

/**
 * `true` at sm+ (≥640px), `false` below sm, `null` until mounted (SSR + first client paint).
 */
export function useReportSmMinWidth(): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia(REPORT_SM_MIN_WIDTH_QUERY);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return matches;
}
