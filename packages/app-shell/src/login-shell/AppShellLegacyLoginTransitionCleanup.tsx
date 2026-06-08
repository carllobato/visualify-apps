"use client";

import { useEffect } from "react";
import { clearLegacyAppLoginTransitionState } from "./app-login-transition";

/** One-shot cleanup so older transition overlays cannot strand users after an upgrade. */
export function AppShellLegacyLoginTransitionCleanup() {
  useEffect(() => {
    clearLegacyAppLoginTransitionState();
  }, []);

  return null;
}
