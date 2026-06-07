"use client";

import "./app-shell-app-menu.css";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { appShellRailMobileOpenFlexRevealClassName, appShellRailMobileOpenRowGapClassName } from "./rail-mobile-classes";
import { appShellRailIconWellClassName, railBrandTitleClass } from "./rail-row-classes";

export type AppShellRailAppCatalogEntry = {
  id: string;
  name: string;
  description?: string;
  href?: string;
};

export type AppShellRailBrandAppMenuProps = {
  /** App name when the rail is expanded (e.g. “HQ”, “Risk AI”). */
  appShortName: string;
  /** Catalog entry id for the active app (e.g. `hq`, `controlai`). */
  currentAppId: string;
  catalog: readonly AppShellRailAppCatalogEntry[];
  /** Brand mark in the collapsed rail slot (40×40). */
  brandIcon: ReactNode;
  brandLabel?: string;
};

function AppMenuCurrentPill() {
  return <span className="ds-app-menu-dropdown__current-pill">Current</span>;
}

function AppMenuItemLabel({ name, trailing }: { name: string; trailing?: ReactNode }) {
  return (
    <span className="ds-app-menu-dropdown__item-row">
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {trailing}
    </span>
  );
}

function IconChevronDownSubtle() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Brand row with Visualify app switcher dropdown.
 * Collapsed rail: icon-only trigger; expanded/hover: {appShortName} + chevron.
 */
export function AppShellRailBrandAppMenu({
  appShortName,
  currentAppId,
  catalog,
  brandIcon,
  brandLabel = "Choose Visualify app",
}: AppShellRailBrandAppMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 140);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => () => cancelScheduledClose(), []);

  return (
    <div
      ref={wrapRef}
      className={
        "relative vf-app-shell-rail-expand-row flex h-10 w-full min-w-0 shrink-0 items-center gap-0 rounded-[var(--ds-radius-md)] transition-[gap] duration-[400ms] ease-out group-data-[pinned=true]:gap-2 " +
        appShellRailMobileOpenRowGapClassName
      }
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={
          "vf-app-shell-rail-expand-row relative flex h-10 min-h-0 min-w-0 flex-1 items-center gap-0 rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 text-left " +
          "transition-[color,gap] duration-[400ms] ease-out " +
          "group-data-[pinned=true]:gap-2 " +
          appShellRailMobileOpenRowGapClassName +
          " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]"
        }
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={brandLabel}
        title="Apps"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className={appShellRailIconWellClassName}>{brandIcon}</span>
        <span
          className={
            `hidden vf-app-shell-rail-expand-flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden text-left ${railBrandTitleClass} ` +
            "group-data-[pinned=true]:flex " + appShellRailMobileOpenFlexRevealClassName
          }
        >
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[var(--ds-text-primary)]">
            {appShortName}
          </span>
          <span
            className={
              "flex shrink-0 items-center text-[color-mix(in_oklab,var(--ds-text-secondary)_58%,transparent)] " +
              "opacity-[0.85] transition-[opacity,color] duration-150 ease-out"
            }
          >
            <IconChevronDownSubtle />
          </span>
        </span>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute inset-x-0 top-full z-[100] mt-[var(--ds-space-1)] w-full min-w-0 ds-app-menu-dropdown"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          {catalog.map((app) => {
            const isCurrent = app.id === currentAppId;

            if (isCurrent) {
              return (
                <div
                  key={app.id}
                  role="menuitem"
                  aria-current="page"
                  className="ds-app-menu-dropdown__item ds-app-menu-dropdown__item--current"
                >
                  <AppMenuItemLabel name={app.name} trailing={<AppMenuCurrentPill />} />
                </div>
              );
            }

            if (app.href) {
              return (
                <a
                  key={app.id}
                  href={app.href}
                  role="menuitem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-app-menu-dropdown__item text-left no-underline"
                  title={app.description}
                >
                  <AppMenuItemLabel name={app.name} />
                </a>
              );
            }

            return (
              <div
                key={app.id}
                role="menuitem"
                aria-disabled
                className="ds-app-menu-dropdown__item ds-app-menu-dropdown__item--coming-soon"
              >
                <AppMenuItemLabel
                  name={app.name}
                  trailing={
                    <span className="ds-app-menu-dropdown__coming-soon-label shrink-0">Coming soon</span>
                  }
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
