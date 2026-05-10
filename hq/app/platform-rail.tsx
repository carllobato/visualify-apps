"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashboardAccountMenu } from "./(hq)/dashboard/dashboard-account-menu";

/** Persist pin preference — each HQ page mounts its own shell, so state must survive remounts. */
const HQ_PLATFORM_RAIL_PINNED_KEY = "hq-platform-rail-pinned";

/** Collapsed rail is 68px; centered 40px icon column uses symmetric (68−40)/2 = 14px horizontal inset. */
const RAIL_PAD_X = "px-[14px]";
const RAIL_EXPANDED_W_CLASS = "w-[68px] hover:w-[min(240px,calc(100vw-16px))]";
/** Rail shell stays transparent so the page canvas shows through (no sidebar fill on hover/pin). */
const RAIL_HOVER_TIMING = "duration-[400ms] ease-out will-change-[width]";

const railLabelClass =
  "min-w-0 shrink truncate text-left text-[length:var(--ds-text-sm)] font-medium leading-none " +
  "w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-[400ms] ease-out " +
  "group-hover:w-auto group-hover:flex-1 group-hover:max-w-[11rem] group-hover:opacity-100 " +
  "group-data-[pinned=true]:w-auto group-data-[pinned=true]:flex-1 group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:opacity-100";

/** Shared shell for nav links and the account row (inactive Billing-style row). */
const RAIL_NAV_ROW_SHELL_CLASS =
  "relative flex h-10 w-full min-w-0 items-center gap-0 rounded-[var(--ds-radius-md)] " +
  "transition-[color,background-color,box-shadow,gap] duration-[400ms] ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)] " +
  "group-hover:gap-2 group-data-[pinned=true]:gap-2 ";

const RAIL_NAV_ROW_INACTIVE_CLASS =
  "text-[var(--ds-text-secondary)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_5%,var(--ds-canvas))] hover:text-[var(--ds-text-primary)]";

const RAIL_NAV_ROW_ACTIVE_CLASS =
  "bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-sm)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-text-primary)]";

/** Same matching rules as Next `<Link>` active styles for primary nav items. */
function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return (
    pathname === pathOnly ||
    (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`))
  );
}

/** Pin/Collapse (always inactive) and Account menu — `<button>` rows share nav chrome + native button resets. */
function railFooterControlRowClass(active: boolean): string {
  // Inactive buttons need `bg-transparent`; active rows use surface from `RAIL_NAV_ROW_ACTIVE_CLASS`.
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

function IconOrganisation() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M4 21h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M6 21V9l6-4 6 4v12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21v-5h4v5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconApps() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={3} y={3} width={7} height={7} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={14} y={3} width={7} height={7} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={14} y={14} width={7} height={7} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={3} y={14} width={7} height={7} rx={1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function IconBilling() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={2} y={5} width={20} height={14} rx={2} stroke="currentColor" strokeWidth={1.5} />
      <path d="M2 10h20" stroke="currentColor" strokeWidth={1.5} />
      <path d="M6 15h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
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

/** Platform rail in layout flow; widens on hover so the main column shrinks via flex. */
export function PlatformRail() {
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
      aria-label="Visualify platform"
    >
      <div className={`flex flex-col gap-2.5 pt-5 ${RAIL_PAD_X}`}>
        <Link
          href="/dashboard"
          title="Visualify HQ"
          aria-label="Visualify HQ"
          className={
            "flex h-10 w-full min-w-0 items-center gap-0 rounded-[var(--ds-radius-md)] no-underline transition-[gap,color] duration-[400ms] ease-out " +
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)] " +
            "group-hover:gap-2 group-data-[pinned=true]:gap-2"
          }
        >
          <span
            className={
              "flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] border-[length:0.5px] border-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] " +
              "bg-[var(--ds-surface)] text-[length:13px] font-semibold leading-none tracking-tight text-[var(--ds-text-primary)] " +
              "transition-colors hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,var(--ds-surface))] " +
              "group-data-[pinned=true]:border-transparent"
            }
          >
            V
          </span>
          <span className={`${railLabelClass} font-semibold`}>Visualify HQ</span>
        </Link>

        <div
          className="h-px w-full max-w-10 shrink-0 bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out group-hover:max-w-none group-data-[pinned=true]:max-w-none"
          role="separator"
          aria-hidden="true"
        />

        <nav className="flex flex-col gap-2.5" aria-label="Primary">
          <RailNavLink href="/dashboard" pathname={pathname} label="Dashboard">
            <IconDashboard />
          </RailNavLink>
          <RailNavLink href="/organisation" pathname={pathname} label="Organisation">
            <IconOrganisation />
          </RailNavLink>
          <RailNavLink href="/apps" pathname={pathname} label="Apps">
            <IconApps />
          </RailNavLink>
          <RailNavLink href="/billing" pathname={pathname} label="Billing">
            <IconBilling />
          </RailNavLink>
        </nav>
      </div>

      <div className={`mt-auto flex min-h-0 w-full flex-col ${RAIL_PAD_X} pb-6 pt-5`}>
        <div
          className={
            "overflow-hidden transition-[max-height,opacity,margin-bottom] duration-[400ms] ease-out " +
            (railPinned
              ? "pointer-events-auto mb-2 max-h-20 opacity-100"
              : "pointer-events-none mb-0 max-h-0 opacity-0 group-hover:pointer-events-auto group-hover:mb-2 group-hover:max-h-20 group-hover:opacity-100")
          }
        >
          <button type="button" className={railFooterControlRowClass(false)}
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
          className="mb-2.5 h-px w-full max-w-10 shrink-0 bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out group-hover:max-w-none group-data-[pinned=true]:max-w-none"
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
    </aside>
  );
}
