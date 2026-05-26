"use client";

import { useAppShellRailMobileNav } from "./app-shell-rail-mobile-context";

function mergeClass(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none shrink-0"
      aria-hidden
    >
      <line x1={4} x2={20} y1={12} y2={12} />
      <line x1={4} x2={20} y1={6} y2={6} />
      <line x1={4} x2={20} y1={18} y2={18} />
    </svg>
  );
}

export type AppShellMobileNavTriggerProps = {
  className?: string;
};

/**
 * Opens/closes the mobile rail drawer. Render inside {@link AppShellRail} (or below it in the same
 * provider tree). Hidden from `md` and up. {@link AppShellRail} mounts a built-in trigger by default.
 */
export function AppShellMobileNavTrigger({ className }: AppShellMobileNavTriggerProps) {
  const { mobileOpen, setMobileOpen } = useAppShellRailMobileNav();

  return (
    <button
      type="button"
      className={mergeClass(
        "vf-app-shell-mobile-nav-trigger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]",
        className,
      )}
      aria-expanded={mobileOpen}
      aria-controls="vf-app-shell-rail"
      aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      onClick={() => setMobileOpen(!mobileOpen)}
    >
      <MenuIcon />
    </button>
  );
}
