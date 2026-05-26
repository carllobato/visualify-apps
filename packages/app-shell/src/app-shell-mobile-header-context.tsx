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

type AppShellMobileHeaderPresenceContextValue = {
  /** True when {@link AppShellMobileHeader} is mounted (or expected on first paint). */
  mobileHeaderPresent: boolean;
  registerMobileHeader: () => void;
  unregisterMobileHeader: () => void;
};

const AppShellMobileHeaderPresenceContext =
  createContext<AppShellMobileHeaderPresenceContextValue | null>(null);

export function AppShellMobileHeaderPresenceProvider({
  children,
  /** Set when the layout always renders a mobile header — avoids a one-frame floating menu flash. */
  mobileHeaderExpected = false,
}: {
  children: ReactNode;
  mobileHeaderExpected?: boolean;
}) {
  const [mountedCount, setMountedCount] = useState(0);

  const registerMobileHeader = useCallback(() => {
    setMountedCount((c) => c + 1);
  }, []);

  const unregisterMobileHeader = useCallback(() => {
    setMountedCount((c) => Math.max(0, c - 1));
  }, []);

  const mobileHeaderPresent = mobileHeaderExpected || mountedCount > 0;

  const value = useMemo(
    () => ({ mobileHeaderPresent, registerMobileHeader, unregisterMobileHeader }),
    [mobileHeaderPresent, registerMobileHeader, unregisterMobileHeader],
  );

  return (
    <AppShellMobileHeaderPresenceContext.Provider value={value}>
      {children}
    </AppShellMobileHeaderPresenceContext.Provider>
  );
}

export function useAppShellMobileHeaderPresent(): boolean {
  const ctx = useContext(AppShellMobileHeaderPresenceContext);
  return ctx?.mobileHeaderPresent ?? false;
}

/** @internal Used by {@link AppShellMobileHeader} and {@link AppShellRail}. */
export function useAppShellMobileHeaderPresenceRegistration(): Pick<
  AppShellMobileHeaderPresenceContextValue,
  "registerMobileHeader" | "unregisterMobileHeader"
> {
  const ctx = useContext(AppShellMobileHeaderPresenceContext);
  if (ctx == null) {
    return {
      registerMobileHeader: () => {},
      unregisterMobileHeader: () => {},
    };
  }
  return {
    registerMobileHeader: ctx.registerMobileHeader,
    unregisterMobileHeader: ctx.unregisterMobileHeader,
  };
}
