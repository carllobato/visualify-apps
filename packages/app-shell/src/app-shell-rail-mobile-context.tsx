"use client";

import { useCallback, createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { shouldCloseMobileDrawerForRailButton } from "./rail-mobile-nav-action";

export type AppShellRailMobileNavContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  closeMobile: () => void;
};

const AppShellRailMobileNavContext = createContext<AppShellRailMobileNavContextValue | null>(null);

export function AppShellRailMobileNavProvider({
  value,
  children,
}: {
  value: AppShellRailMobileNavContextValue;
  children: ReactNode;
}) {
  return (
    <AppShellRailMobileNavContext.Provider value={value}>{children}</AppShellRailMobileNavContext.Provider>
  );
}

/** Mobile drawer state — available under {@link AppShellOuterCanvas} (via {@link AppShellRailMobileNavController}). */
export function useAppShellRailMobileNav(): AppShellRailMobileNavContextValue {
  const ctx = useContext(AppShellRailMobileNavContext);
  if (ctx == null) {
    throw new Error("useAppShellRailMobileNav must be used within <AppShellOuterCanvas>");
  }
  return ctx;
}

/**
 * Wraps a rail `<button>` handler so the mobile drawer closes after navigation/selection actions.
 * Respects {@link shouldCloseMobileDrawerForRailButton} (skips menu toggles, pin, hamburger).
 */
export function useAppShellRailNavActionOnClick(
  handler?: (event: MouseEvent<HTMLButtonElement>) => void,
): (event: MouseEvent<HTMLButtonElement>) => void {
  const { closeMobile } = useAppShellRailMobileNav();
  return useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      handler?.(event);
      if (!event.defaultPrevented && shouldCloseMobileDrawerForRailButton(event.currentTarget)) {
        closeMobile();
      }
    },
    [handler, closeMobile],
  );
}
