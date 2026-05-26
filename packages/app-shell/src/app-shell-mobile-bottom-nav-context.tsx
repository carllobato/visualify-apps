"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppShellMobileBottomNavPresenceContextValue = {
  /** True when {@link AppShellMobileBottomNav} is mounted. */
  mobileBottomNavPresent: boolean;
  registerMobileBottomNav: () => void;
  unregisterMobileBottomNav: () => void;
};

const AppShellMobileBottomNavPresenceContext =
  createContext<AppShellMobileBottomNavPresenceContextValue | null>(null);

export function AppShellMobileBottomNavPresenceProvider({ children }: { children: ReactNode }) {
  const [mountedCount, setMountedCount] = useState(0);

  const registerMobileBottomNav = useCallback(() => {
    setMountedCount((c) => c + 1);
  }, []);

  const unregisterMobileBottomNav = useCallback(() => {
    setMountedCount((c) => Math.max(0, c - 1));
  }, []);

  const mobileBottomNavPresent = mountedCount > 0;

  const value = useMemo(
    () => ({ mobileBottomNavPresent, registerMobileBottomNav, unregisterMobileBottomNav }),
    [mobileBottomNavPresent, registerMobileBottomNav, unregisterMobileBottomNav],
  );

  return (
    <AppShellMobileBottomNavPresenceContext.Provider value={value}>
      {children}
    </AppShellMobileBottomNavPresenceContext.Provider>
  );
}

export function useAppShellMobileBottomNavPresent(): boolean {
  const ctx = useContext(AppShellMobileBottomNavPresenceContext);
  return ctx?.mobileBottomNavPresent ?? false;
}

/** @internal Used by {@link AppShellMobileBottomNav}. */
export function useAppShellMobileBottomNavPresenceRegistration(): Pick<
  AppShellMobileBottomNavPresenceContextValue,
  "registerMobileBottomNav" | "unregisterMobileBottomNav"
> {
  const ctx = useContext(AppShellMobileBottomNavPresenceContext);
  if (ctx == null) {
    return {
      registerMobileBottomNav: () => {},
      unregisterMobileBottomNav: () => {},
    };
  }
  return {
    registerMobileBottomNav: ctx.registerMobileBottomNav,
    unregisterMobileBottomNav: ctx.unregisterMobileBottomNav,
  };
}
