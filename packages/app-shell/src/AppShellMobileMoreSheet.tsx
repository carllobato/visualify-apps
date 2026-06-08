"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./app-shell-mobile-more-sheet.css";

/** Menu row styling — pair with `block` on links for full-width hit targets. */
export const appShellMobileMoreSheetItemClassName =
  "vf-app-shell-mobile-more-sheet__item ds-app-menu-dropdown__item";

export type AppShellMobileMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: ReactNode;
};

export function AppShellMobileMoreSheetList({ children }: { children: ReactNode }) {
  return <ul className="vf-app-shell-mobile-more-sheet__list">{children}</ul>;
}

export function AppShellMobileMoreSheetListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

/**
 * Drop-up More menu above the mobile bottom tab bar. Use with bottom-nav `kind: "more"` and
 * `onPress` / `pressed` instead of opening the rail drawer. Products supply menu rows via
 * {@link AppShellMobileMoreSheetList} and {@link appShellMobileMoreSheetItemClassName}.
 */
export function AppShellMobileMoreSheet({
  open,
  onClose,
  ariaLabel = "More options",
  children,
}: AppShellMobileMoreSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  /*
   * Portal into the shell root (position: fixed; inset: 0 = full physical screen) so the drop-up
   * anchors to the true screen bottom — same reference as the in-flow bottom nav. Falls back to
   * <body> when no shell is mounted.
   */
  const portalTarget =
    document.querySelector<HTMLElement>(".vf-app-shell-outer-canvas") ?? document.body;

  return createPortal(
    <>
      <button
        type="button"
        className="vf-app-shell-mobile-more-sheet__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="vf-app-shell-mobile-more-sheet" role="menu" aria-label={ariaLabel}>
        {children}
      </div>
    </>,
    portalTarget,
  );
}
