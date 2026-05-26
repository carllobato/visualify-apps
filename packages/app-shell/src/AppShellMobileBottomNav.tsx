"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import "./app-shell-mobile-bottom-nav.css";
import { useAppShellMobileBottomNavPresenceRegistration } from "./app-shell-mobile-bottom-nav-context";
import { useAppShellRailMobileNav } from "./app-shell-rail-mobile-context";

export type AppShellMobileBottomNavLinkItem = {
  kind: "link";
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export type AppShellMobileBottomNavMoreItem = {
  kind: "more";
  label?: string;
  icon?: ReactNode;
};

export type AppShellMobileBottomNavItem =
  | AppShellMobileBottomNavLinkItem
  | AppShellMobileBottomNavMoreItem;

export type AppShellMobileBottomNavProps = {
  /** Tab items — up to five recommended (`link` and/or `more`). */
  items: readonly AppShellMobileBottomNavItem[];
  /** Accessible name for the tab list. */
  ariaLabel?: string;
  className?: string;
};

function mergeClass(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function DefaultMoreIcon() {
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
      aria-hidden
    >
      <circle cx={5} cy={12} r={1.25} fill="currentColor" stroke="none" />
      <circle cx={12} cy={12} r={1.25} fill="currentColor" stroke="none" />
      <circle cx={19} cy={12} r={1.25} fill="currentColor" stroke="none" />
    </svg>
  );
}

function BottomNavTabIcon({ children }: { children: ReactNode }) {
  return <span className="vf-app-shell-mobile-bottom-nav__icon">{children}</span>;
}

function BottomNavTabLabel({ children }: { children: ReactNode }) {
  return <span className="vf-app-shell-mobile-bottom-nav__label">{children}</span>;
}

type BottomNavLinkTabProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onNavigate: () => void;
};

function BottomNavLinkTab({ href, label, icon, active, onNavigate }: BottomNavLinkTabProps) {
  return (
    <li className="vf-app-shell-mobile-bottom-nav__item">
      <Link
        href={href}
        className="vf-app-shell-mobile-bottom-nav__control"
        aria-label={label}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        onClick={() => onNavigate()}
      >
        <BottomNavTabIcon>{icon}</BottomNavTabIcon>
        <BottomNavTabLabel>{label}</BottomNavTabLabel>
      </Link>
    </li>
  );
}

type BottomNavMoreTabProps = {
  label: string;
  icon: ReactNode;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
};

function BottomNavMoreTab({ label, icon, drawerOpen, onOpenDrawer }: BottomNavMoreTabProps) {
  return (
    <li className="vf-app-shell-mobile-bottom-nav__item">
      <button
        type="button"
        className="vf-app-shell-mobile-bottom-nav__control"
        aria-label={label}
        aria-expanded={drawerOpen}
        aria-controls="vf-app-shell-rail"
        onClick={onOpenDrawer}
      >
        <BottomNavTabIcon>{icon}</BottomNavTabIcon>
        <BottomNavTabLabel>{label}</BottomNavTabLabel>
      </button>
    </li>
  );
}

/**
 * Mobile-only floating bottom tab bar. Mount inside {@link AppShellOuterCanvas} (e.g. in
 * {@link AppShellMainColumn}) so scroll inset and the rail drawer integrate correctly.
 */
export function AppShellMobileBottomNav({
  items,
  ariaLabel = "Primary",
  className,
}: AppShellMobileBottomNavProps) {
  const { registerMobileBottomNav, unregisterMobileBottomNav } =
    useAppShellMobileBottomNavPresenceRegistration();
  const { mobileOpen, setMobileOpen, closeMobile } = useAppShellRailMobileNav();

  useLayoutEffect(() => {
    registerMobileBottomNav();
    return unregisterMobileBottomNav;
  }, [registerMobileBottomNav, unregisterMobileBottomNav]);

  return (
    <nav
      className={mergeClass("vf-app-shell-mobile-bottom-nav", className)}
      aria-label={ariaLabel}
    >
      <ul className="vf-app-shell-mobile-bottom-nav__list">
        {items.map((item, index) => {
          if (item.kind === "link") {
            return (
              <BottomNavLinkTab
                key={`${item.href}-${index}`}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={item.active === true}
                onNavigate={() => {
                  if (mobileOpen) closeMobile();
                }}
              />
            );
          }

          const moreLabel = item.label ?? "More";
          return (
            <BottomNavMoreTab
              key={`more-${index}`}
              label={moreLabel}
              icon={item.icon ?? <DefaultMoreIcon />}
              drawerOpen={mobileOpen}
              onOpenDrawer={() => setMobileOpen(true)}
            />
          );
        })}
      </ul>
    </nav>
  );
}
