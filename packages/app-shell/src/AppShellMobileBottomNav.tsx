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
  /**
   * When set, called instead of opening the mobile rail drawer (product-specific menus).
   */
  onPress?: () => void;
  /** When `onPress` is set, drives `aria-expanded` for the More control. */
  pressed?: boolean;
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
  onPress?: () => void;
  pressed?: boolean;
};

function BottomNavMoreTab({
  label,
  icon,
  drawerOpen,
  onOpenDrawer,
  onPress,
  pressed,
}: BottomNavMoreTabProps) {
  const usesCustomPress = onPress != null;
  const expanded = usesCustomPress ? pressed === true : drawerOpen;

  return (
    <li className="vf-app-shell-mobile-bottom-nav__item">
      <button
        type="button"
        className="vf-app-shell-mobile-bottom-nav__control"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={usesCustomPress ? undefined : "vf-app-shell-rail"}
        onClick={() => {
          if (onPress != null) {
            onPress();
            return;
          }
          onOpenDrawer();
        }}
      >
        <BottomNavTabIcon>{icon}</BottomNavTabIcon>
        <BottomNavTabLabel>{label}</BottomNavTabLabel>
      </button>
    </li>
  );
}

/**
 * Mobile-only bottom tab bar (≤767px). Mount inside {@link AppShellMainColumn} within
 * {@link AppShellOuterCanvas} so scroll bottom inset and the rail drawer integrate correctly.
 *
 * Pass app-specific `items` (typically built with {@link buildAppShellMobileBottomNavItems}).
 * A `kind: "more"` item calls `setMobileOpen(true)` on the shared rail drawer; `kind: "link"`
 * items close the drawer on navigate when it is open. Registration sets
 * `.vf-app-shell-has-mobile-bottom-nav` on the outer canvas for shared safe-area padding.
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
              onPress={item.onPress}
              pressed={item.pressed}
            />
          );
        })}
      </ul>
    </nav>
  );
}
