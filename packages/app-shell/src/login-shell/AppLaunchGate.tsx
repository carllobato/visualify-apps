"use client";

import { useEffect, useState, type ReactNode } from "react";
import { VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS } from "../app-launch-splash";

function isLaunchComplete(): boolean {
  return document.documentElement.classList.contains(VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS);
}

/**
 * Defers interactive login UI until the launch splash finishes so iOS Password AutoFill
 * and other credential overlays do not appear over the loading screen.
 */
export function AppLaunchGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLaunchComplete()) {
      setReady(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (!isLaunchComplete()) return;
      setReady(true);
      observer.disconnect();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (!ready) {
    return null;
  }

  return children;
}
