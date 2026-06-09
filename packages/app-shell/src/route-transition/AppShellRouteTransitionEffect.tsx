"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearAppShellRouteTransitionState,
  consumeAppShellRouteEnterPending,
  revealAppShellRouteDestination,
} from "./app-shell-route-transition";

function resetAppShellScrollRegion(): void {
  const scrollRegion = document.querySelector(".vf-app-shell-scroll-region");
  if (scrollRegion instanceof HTMLElement) {
    scrollRegion.scrollTop = 0;
  }
}

/** Mount in the signed-in shell — fades the destination in after {@link navigateAfterAppShellRouteTransition}. */
export function AppShellRouteTransitionEffect() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    resetAppShellScrollRegion();

    if (!consumeAppShellRouteEnterPending()) {
      clearAppShellRouteTransitionState();
      return;
    }

    let cancelled = false;

    void (async () => {
      await revealAppShellRouteDestination();

      if (!cancelled) {
        clearAppShellRouteTransitionState();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
