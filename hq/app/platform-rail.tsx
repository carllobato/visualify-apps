"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashboardAccountMenu } from "./(hq)/dashboard/dashboard-account-menu";
import { WorkspaceRailList } from "./entity-rail-list";
import type { EntityRailWorkspace } from "@/lib/entity-rail-grouping";
import { VISUALIFY_APP_CATALOG } from "@/lib/visualify-apps";
import {
  RAIL_NAV_ROW_ACTIVE_CLASS,
  RAIL_NAV_ROW_INACTIVE_CLASS,
  RAIL_NAV_ROW_SHELL_CLASS,
  railLabelClass,
} from "./rail-nav-row-classes";

/** Persist pin preference — each HQ page mounts its own shell, so state must survive remounts. */
const HQ_PLATFORM_RAIL_PINNED_KEY = "hq-platform-rail-pinned";

/** App name segment in “Visualify | …” when the rail is expanded. */
const HQ_BRAND_APP_SHORT = "HQ";

/** Collapsed rail is 68px; centered 40px icon column uses symmetric (68−40)/2 = 14px horizontal inset. */
const RAIL_PAD_X = "px-[14px]";
/** Matches app header product switcher (`text-lg font-medium …`). */
const RAIL_BRAND_TEXT_CLASS =
  "text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight";
const RAIL_EXPANDED_W_CLASS = "w-[68px] hover:w-[min(240px,calc(100vw-16px))]";
/** Rail shell stays transparent so the page canvas shows through (no sidebar fill on hover/pin). */
const RAIL_HOVER_TIMING = "duration-[400ms] ease-out will-change-[width]";

/** Same matching rules as Next `<Link>` active styles for primary nav items. */
function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return (
    pathname === pathOnly ||
    (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`))
  );
}

/** Pin/Collapse and Account menu — `<button>` rows share nav chrome + native button resets. */
function railFooterControlRowClass(active: boolean): string {
  return (
    `${RAIL_NAV_ROW_SHELL_CLASS}${active ? RAIL_NAV_ROW_ACTIVE_CLASS : RAIL_NAV_ROW_INACTIVE_CLASS}` +
    " cursor-pointer border-0 text-left no-underline " +
    (active ? "" : "bg-transparent ")
  );
}

function RailNavLink({
  href,
  label,
  pathname,
  children,
}: {
  href: string;
  label: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = railNavHrefActive(pathname, href);

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={RAIL_NAV_ROW_SHELL_CLASS + (active ? RAIL_NAV_ROW_ACTIVE_CLASS : RAIL_NAV_ROW_INACTIVE_CLASS)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center">{children}</span>
      <span className={railLabelClass}>{label}</span>
    </Link>
  );
}

/** Subtle chevron for app switcher — smaller stroke than account menu chevron. */
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

/** Bold “V” brand mark — same scale as rail brand label (`RAIL_BRAND_TEXT_CLASS`), weight bold. */
function BrandMonogramSymbol() {
  return (
    <span
      aria-hidden
      className={
        "shrink-0 select-none text-[length:var(--ds-text-lg)] font-bold leading-none tracking-tight text-[var(--ds-text-primary)]"
      }
    >
      V
    </span>
  );
}

/**
 * Brand row opens the app menu (HQ current + catalog). Same affordance when the rail is
 * collapsed (icon-only): click opens the menu; expanded rail shows “Visualify | HQ” + chevron.
 */
function RailBrandAppMenu() {
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
      className="relative flex h-10 w-full min-w-0 flex-1 items-center gap-0 rounded-[var(--ds-radius-md)] transition-[gap] duration-[400ms] ease-out group-hover:gap-2 group-data-[pinned=true]:gap-2"
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={
          "relative flex h-10 min-h-0 min-w-0 flex-1 items-center gap-0 rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 text-left " +
          "transition-[color,gap] duration-[400ms] ease-out " +
          "group-hover:gap-2 group-data-[pinned=true]:gap-2 " +
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]"
        }
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Choose Visualify app"
        title="Apps"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <span className="flex size-10 shrink-0 items-center justify-center">
          <BrandMonogramSymbol />
        </span>
        <span
          className={
            `hidden min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden text-left ${RAIL_BRAND_TEXT_CLASS} ` +
            "group-hover:flex group-data-[pinned=true]:flex"
          }
        >
          <span className="flex min-w-0 flex-1 items-center justify-start gap-1.5 overflow-hidden">
            <span className="shrink-0 whitespace-nowrap text-[var(--ds-text-primary)]">Visualify</span>
            <span
              className="shrink-0 whitespace-nowrap text-[color-mix(in_oklab,var(--ds-text-tertiary)_88%,transparent)]"
              aria-hidden
            >
              |
            </span>
            <span className="min-w-0 truncate whitespace-nowrap text-[var(--ds-text-primary)]">
              {HQ_BRAND_APP_SHORT}
            </span>
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
          className="absolute left-0 top-full z-[100] min-w-[220px] pt-0.5"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          <div className="ds-app-menu-dropdown ds-app-menu-dropdown--min-w-nav">
            <div
              className="border-b border-[color-mix(in_oklab,var(--ds-border)_45%,transparent)] px-[var(--ds-space-4)] pb-2 pt-1.5"
              role="presentation"
            >
              <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-tertiary)]">
                Apps
              </div>
            </div>
            <div
              role="menuitem"
              aria-current="page"
              className="ds-app-menu-dropdown__item pointer-events-none cursor-default font-medium text-[var(--ds-text-primary)] hover:!bg-transparent"
            >
              Visualify HQ
              <span className="mt-0.5 block text-[length:var(--ds-text-xs)] font-normal text-[var(--ds-text-tertiary)]">
                Current app
              </span>
            </div>
            {VISUALIFY_APP_CATALOG.map((app) =>
              app.href ? (
                <a
                  key={app.id}
                  href={app.href}
                  role="menuitem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ds-app-menu-dropdown__item no-underline"
                  title={app.description}
                >
                  <span className="font-medium">{app.name}</span>
                  <span className="mt-0.5 block text-[length:var(--ds-text-xs)] font-normal text-[var(--ds-text-tertiary)]">
                    {app.description}
                  </span>
                </a>
              ) : (
                <div
                  key={app.id}
                  role="menuitem"
                  aria-disabled
                  className="ds-app-menu-dropdown__item pointer-events-none cursor-default text-[var(--ds-text-muted)] opacity-[0.82] hover:!bg-transparent"
                >
                  <span className="block font-normal">{app.name}</span>
                  <span className="mt-0.5 block text-[length:var(--ds-text-xs)] text-[var(--ds-text-tertiary)]">
                    Coming soon
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconDashboard() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={3} y={3} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={3} width={8} height={5} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={10} width={8} height={11} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={3} y={13} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

/** Matches RiskAI `Sidebar.tsx` — pin when rail is narrow / unpinned. */
function RailPinOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.76Z" />
    </svg>
  );
}

/** Matches RiskAI `Sidebar.tsx` — panel when rail is pinned open (collapse action). */
function RailPanelLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

export function PlatformRail({
  workspaces,
  selectedWorkspaceId,
}: {
  workspaces: EntityRailWorkspace[];
  selectedWorkspaceId: string | null;
}) {
  const pathname = usePathname();
  const [railPinned, setRailPinned] = useState(false);
  const skipInitialPersist = useRef(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(HQ_PLATFORM_RAIL_PINNED_KEY) === "true") {
        setRailPinned(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(HQ_PLATFORM_RAIL_PINNED_KEY, railPinned ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [railPinned]);

  const widthClass = railPinned
    ? "w-[min(240px,calc(100vw-16px))]"
    : RAIL_EXPANDED_W_CLASS;

  const accountRailActive = railNavHrefActive(pathname, "/account");

  return (
    <aside
      data-pinned={railPinned ? "true" : undefined}
      className={
        `group relative z-30 flex min-h-dvh shrink-0 flex-col self-stretch overflow-visible bg-transparent ${widthClass} ` +
        `transition-[width] ${RAIL_HOVER_TIMING} ` +
        "rounded-br-[var(--ds-radius-lg)] rounded-tr-[var(--ds-radius-lg)]"
      }
      aria-label="Visualify HQ"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${RAIL_PAD_X} pt-5`}>
        <div className="flex flex-col gap-2.5">
          <RailBrandAppMenu />

          <div
            className="h-px w-full max-w-10 shrink-0 bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out group-hover:max-w-none group-data-[pinned=true]:max-w-none"
            role="separator"
            aria-hidden="true"
          />

          <nav className="flex flex-col gap-2.5" aria-label="Primary">
            <RailNavLink href="/dashboard" pathname={pathname} label="Dashboard">
              <IconDashboard />
            </RailNavLink>
          </nav>

          <WorkspaceRailList workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />
        </div>

        <div className="mt-auto flex min-h-0 w-full flex-col pt-5 pb-5 sm:pb-[26px]">
          <div
            className={
              "overflow-hidden transition-[max-height,opacity,margin-bottom] duration-[400ms] ease-out " +
              (railPinned
                ? "pointer-events-auto max-h-20 opacity-100"
                : "pointer-events-none max-h-0 opacity-0 group-hover:pointer-events-auto group-hover:max-h-20 group-hover:opacity-100")
            }
          >
            <button
              type="button"
              className={railFooterControlRowClass(false)}
              aria-pressed={railPinned}
              title={railPinned ? "Collapse sidebar" : "Pin sidebar open"}
              aria-label={railPinned ? "Collapse sidebar" : "Pin sidebar open"}
              onClick={() => setRailPinned((p) => !p)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center">
                {railPinned ? <RailPanelLeftIcon /> : <RailPinOpenIcon />}
              </span>
              <span className={railLabelClass}>{railPinned ? "Collapse" : "Pin Open"}</span>
            </button>
          </div>

          <div
            className="my-2.5 h-px w-full max-w-10 shrink-0 bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out group-hover:max-w-none group-data-[pinned=true]:max-w-none"
            role="separator"
            aria-hidden="true"
          />

          <DashboardAccountMenu
            variant="rail"
            railRowClassName={railFooterControlRowClass(accountRailActive)}
            railLabelClassName={railLabelClass}
            railPageActive={accountRailActive}
          />
        </div>
      </div>
    </aside>
  );
}
