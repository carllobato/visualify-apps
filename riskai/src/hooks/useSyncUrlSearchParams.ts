"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Reads `window.location.search` without using Next's `useSearchParams()`, which suspends and
 * retriggers the nearest Suspense fallback on client navigations — undesirable for persistent header UI.
 *
 * `initialUrlSearch` should match the request query (see `x-url-search` from middleware) for correct SSR/hydration.
 */
let historyPatched = false;
const searchListeners = new Set<() => void>();

function notifySearchListeners() {
  const snapshot = Array.from(searchListeners);
  for (const l of snapshot) {
    l();
  }
}

function ensureHistoryPatched() {
  if (historyPatched || typeof window === "undefined") return;
  historyPatched = true;
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);
  // Defer so we never notify useSyncExternalStore subscribers synchronously inside history APIs.
  // Next.js may call pushState during React commit (e.g. near useInsertionEffect); immediate notify
  // would schedule updates and trigger "useInsertionEffect must not schedule updates."
  const notifySoon = () => queueMicrotask(notifySearchListeners);
  history.pushState = (...args: Parameters<History["pushState"]>) => {
    originalPush(...args);
    notifySoon();
  };
  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    originalReplace(...args);
    notifySoon();
  };
  window.addEventListener("popstate", notifySoon);
}

function subscribeToUrlSearch(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  ensureHistoryPatched();
  searchListeners.add(onStoreChange);
  return () => {
    searchListeners.delete(onStoreChange);
  };
}

export function useSyncUrlSearchParams(initialUrlSearch: string): URLSearchParams {
  const searchString = useSyncExternalStore(
    subscribeToUrlSearch,
    () => (typeof window !== "undefined" ? window.location.search : initialUrlSearch),
    () => initialUrlSearch
  );
  return useMemo(() => {
    const s = searchString ?? "";
    const q = s.startsWith("?") ? s.slice(1) : s;
    return new URLSearchParams(q);
  }, [searchString]);
}
