"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@visualify/design-system";
import { isVisualifyStaffEmail } from "@/lib/auth/visualifyStaff";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { setSideNavPinnedCookie } from "@/lib/sideNavPinnedCookie";
import {
  DASHBOARD_PATH,
  portfolioIdFromAppPathname,
  projectIdFromAppPathname,
  riskaiPath,
  RISKAI_BASE,
} from "@/lib/routes";

const ACTIVE_PROJECT_KEY = "activeProjectId";
const SIDENAV_KEY = "riskai-side-nav-pinned";

function parseSideNavPinnedFromDb(raw: unknown): boolean | null {
  if (raw === true || raw === false) return raw;
  return null;
}

async function persistSideNavPinnedToSupabase(pinned: boolean): Promise<void> {
  try {
    const client = supabaseBrowserClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;
    await client.from("visualify_profiles").update({ side_nav_pinned: pinned }).eq("id", user.id);
  } catch {
    /* silent */
  }
}

const PanelLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

/** Pushpin — use when rail is collapsed (hover-only) to suggest “pin open”. */
const PinOpenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    aria-hidden
  >
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.76Z" />
  </svg>
);

const LayoutGridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const ProjectsListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M8 6h8" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h8" />
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const SimulationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const EngineIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 shrink-0"
    aria-hidden
  >
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M15 2v2" />
    <path d="M15 20v2" />
    <path d="M9 2v2" />
    <path d="M9 20v2" />
    <path d="M22 9v-1a2 2 0 0 0-2-2h-1" />
    <path d="M22 15v1a2 2 0 0 1-2 2h-1" />
    <path d="M2 9v-1a2 2 0 0 1 2-2h1" />
    <path d="M2 15v1a2 2 0 0 0 2 2h1" />
  </svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** From server cookie so first HTML matches saved rail width (default: pinned open). */
  initialSideNavPinned?: boolean;
};

/** Brief delay before expanding the collapsed rail so cursor passes don’t flash the panel open. */
const SIDEBAR_HOVER_OPEN_DELAY_MS = 250;

export function Sidebar({
  mobileOpen,
  onMobileClose,
  initialSideNavPinned = true,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => initialSideNavPinned === false);
  /** When rail is collapsed, hover temporarily expands labels/width (desktop hover). */
  const [hoverPeek, setHoverPeek] = useState(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!collapsed) {
      setHoverPeek(false);
      if (hoverEnterTimerRef.current) {
        clearTimeout(hoverEnterTimerRef.current);
        hoverEnterTimerRef.current = null;
      }
    }
  }, [collapsed]);

  useEffect(
    () => () => {
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
      if (hoverEnterTimerRef.current) clearTimeout(hoverEnterTimerRef.current);
    },
    []
  );

  const visuallyCollapsed = collapsed && !hoverPeek;
  const portfolioIdFromUrl = portfolioIdFromAppPathname(pathname);
  const projectIdFromUrl = projectIdFromAppPathname(pathname);
  const projectIdFromUrlRef = useRef(projectIdFromUrl);
  const [portfolioIdForProject, setPortfolioIdForProject] = useState<string | null>(null);
  const [projectIdFromStorage, setProjectIdFromStorage] = useState<string | null>(null);
  const [showDebugNav, setShowDebugNav] = useState(false);

  useEffect(() => {
    projectIdFromUrlRef.current = projectIdFromUrl;
  }, [projectIdFromUrl]);

  const supabase = useMemo(() => supabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: row } = await supabase
          .from("visualify_profiles")
          .select("side_nav_pinned")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const remote = parseSideNavPinnedFromDb(row?.side_nav_pinned as unknown);
        if (remote === null) return;
        let localPinned: boolean;
        try {
          const raw = localStorage.getItem(SIDENAV_KEY);
          if (raw === "false") localPinned = false;
          else if (raw === "true") localPinned = true;
          else localPinned = true;
        } catch {
          localPinned = true;
        }
        if (localPinned === remote) return;
        if (cancelled) return;
        setCollapsed(!remote);
        try {
          localStorage.setItem(SIDENAV_KEY, remote ? "true" : "false");
        } catch {
          /* silent */
        }
        setSideNavPinnedCookie(remote);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const sync = (email: string | null | undefined) => {
      setShowDebugNav(isVisualifyStaffEmail(email));
    };
    void supabase.auth.getUser().then(({ data: { user } }) => sync(user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
      const id =
        typeof raw === "string" && raw !== "undefined" && raw.trim().length > 0 ? raw.trim() : null;
      setProjectIdFromStorage(id);
    } catch {
      setProjectIdFromStorage(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (!projectIdFromUrl) {
      setPortfolioIdForProject(null);
      return;
    }
    let cancelled = false;
    const requestedId = projectIdFromUrl;
    supabase
      .from("visualify_projects")
      .select("portfolio_id")
      .eq("id", requestedId)
      .single()
      .then(({ data, error }) => {
        if (cancelled || projectIdFromUrlRef.current !== requestedId) return;
        if (error || !data?.portfolio_id) {
          setPortfolioIdForProject(null);
          return;
        }
        setPortfolioIdForProject(data.portfolio_id);
      });
    return () => {
      cancelled = true;
    };
  }, [projectIdFromUrl, supabase]);

  const portfolioId = portfolioIdFromUrl ?? portfolioIdForProject;
  const projectId = projectIdFromUrl ?? projectIdFromStorage;

  /** Portfolio nav: only on a portfolio route, or on a project that belongs to a portfolio. */
  const showPortfolioNav =
    portfolioIdFromUrl != null || portfolioIdForProject != null;

  /** Project nav: only while viewing a project URL (`/projects/[id]/…`). */
  const projectIdInUrl = projectIdFromAppPathname(pathname);
  const showProjectNav = projectIdInUrl != null;
  const projectNavBase = projectIdInUrl ? riskaiPath(`/projects/${projectIdInUrl}`) : null;

  const portfolioOverviewHref = portfolioId ? riskaiPath(`/portfolios/${portfolioId}`) : riskaiPath("/portfolios");
  const projectBase = projectId ? riskaiPath(`/projects/${projectId}`) : null;

  const dashboardActive = pathname === DASHBOARD_PATH;
  const portfolioOverviewActive =
    portfolioId != null &&
    (pathname === `${RISKAI_BASE}/portfolios/${portfolioId}` ||
      pathname === `${RISKAI_BASE}/portfolios/${portfolioId}/`);
  const portfolioProjectsActive =
    portfolioId != null && pathname.startsWith(`${RISKAI_BASE}/portfolios/${portfolioId}/projects`);
  const portfolioSettingsActive =
    portfolioId != null &&
    pathname.startsWith(`${RISKAI_BASE}/portfolios/${portfolioId}/portfolio-settings`);

  const projectOverviewActive =
    projectBase != null &&
    (pathname === projectBase || pathname === `${projectBase}/`);
  const runDataActive = projectBase != null && pathname.startsWith(`${projectBase}/run-data`);
  const risksActive = projectBase != null && pathname.startsWith(`${projectBase}/risks`);
  const simulationActive =
    projectNavBase != null && pathname.startsWith(`${projectNavBase}/simulation`);
  const healthActive =
    (projectNavBase != null && pathname.startsWith(`${projectNavBase}/engine-health`)) ||
    pathname === `${RISKAI_BASE}/dev/engine-health` ||
    pathname.startsWith(`${RISKAI_BASE}/dev/engine-health/`);
  const projectSettingsActive =
    projectNavBase != null && pathname.startsWith(`${projectNavBase}/settings`);

  const navTransition = "duration-[400ms] ease-out";

  const linkClass = (active: boolean, disabled?: boolean) =>
    "ds-nav-link ds-nav-link--rail flex min-w-0 items-center gap-0 py-2 pl-3 pr-3 text-[length:var(--ds-text-sm)] no-underline " +
    (disabled
      ? "ds-nav-link--disabled cursor-not-allowed"
      : active
        ? "ds-nav-link--active"
        : "");

  /** Width, opacity, and margin animate together; margin replaces gap so spacing doesn’t jump. */
  const navLabelClass =
    "block min-w-0 overflow-hidden text-left whitespace-nowrap transition-[max-width,opacity,margin] " +
    navTransition +
    " " +
    (visuallyCollapsed
      ? "ml-0 max-w-0 opacity-0 pointer-events-none"
      : "ml-2 max-w-[min(12rem,100%)] opacity-100");

  /** Collapsed: horizontal rule centered on the label line (outer pt/mt must not skew top-1/2). */
  const sectionHeader = (label: string, isFirst = false) => (
    <div
      className={
        "ds-sidebar-section-header px-3 pb-1 pt-4 first:pt-1 " +
        (!isFirst ? "mt-1" : "")
      }
    >
      <div className="relative">
        {visuallyCollapsed ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-[var(--ds-status-neutral-subtle-border)]"
            aria-hidden
          />
        ) : null}
        <span
          className={
            "ds-sidebar-section-header-label relative z-10 block overflow-hidden whitespace-nowrap transition-[max-width,opacity] " +
            navTransition +
            " " +
            (visuallyCollapsed ? "max-w-0 opacity-0" : "max-w-[min(12rem,100%)] opacity-100")
          }
          aria-hidden={visuallyCollapsed}
        >
          {label}
        </span>
      </div>
    </div>
  );

  const widthClass = visuallyCollapsed ? "w-[56px]" : "w-56";

  const handleAsidePointerEnter = () => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    if (!collapsed) return;
    if (hoverEnterTimerRef.current) {
      clearTimeout(hoverEnterTimerRef.current);
      hoverEnterTimerRef.current = null;
    }
    hoverEnterTimerRef.current = setTimeout(() => {
      setHoverPeek(true);
      hoverEnterTimerRef.current = null;
    }, SIDEBAR_HOVER_OPEN_DELAY_MS);
  };

  const handleAsidePointerLeave = () => {
    if (hoverEnterTimerRef.current) {
      clearTimeout(hoverEnterTimerRef.current);
      hoverEnterTimerRef.current = null;
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoverPeek(false);
      hoverLeaveTimerRef.current = null;
    }, 80);
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 ds-modal-backdrop-surface md:hidden"
          aria-label="Close navigation"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={
          "ds-app-sidebar fixed bottom-3 left-3 top-[calc(var(--ds-app-header-height)+12px)] z-50 flex flex-col transition-[transform,width] duration-[400ms] ease-out will-change-[width] md:sticky md:top-[calc(var(--ds-app-header-height)+12px)] md:z-0 md:ml-3 md:mt-[calc(var(--ds-app-header-height)+12px)] md:mb-3 md:h-[calc(100dvh-var(--ds-app-header-height)-24px)] md:self-start " +
          widthClass +
          (mobileOpen ? " translate-x-0" : " -translate-x-full md:translate-x-0")
        }
        onMouseEnter={handleAsidePointerEnter}
        onMouseLeave={handleAsidePointerLeave}
      >
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-[var(--ds-space-2)]">
          {sectionHeader("Main", true)}
          <ul className="space-y-0.5">
            <li>
              <Link href={DASHBOARD_PATH} className={linkClass(dashboardActive)} title={visuallyCollapsed ? "Dashboard" : undefined} onClick={onMobileClose}>
                <LayoutGridIcon />
                <span className={navLabelClass}>Dashboard</span>
              </Link>
            </li>
          </ul>

          {showPortfolioNav ? (
            <>
              {sectionHeader("Portfolio", false)}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={portfolioOverviewHref}
                    className={linkClass(portfolioOverviewActive)}
                    title={visuallyCollapsed ? "Portfolio Overview" : undefined}
                    onClick={onMobileClose}
                  >
                    <BriefcaseIcon />
                    <span className={navLabelClass}>Portfolio Overview</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={riskaiPath(`/portfolios/${portfolioId}/projects`)}
                    className={linkClass(portfolioProjectsActive)}
                    title={visuallyCollapsed ? "Projects" : undefined}
                    onClick={onMobileClose}
                  >
                    <ProjectsListIcon />
                    <span className={navLabelClass}>Projects</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={riskaiPath(`/portfolios/${portfolioId}/portfolio-settings`)}
                    className={linkClass(portfolioSettingsActive)}
                    title={visuallyCollapsed ? "Portfolio Settings" : undefined}
                    onClick={onMobileClose}
                  >
                    <CogIcon />
                    <span className={navLabelClass}>Portfolio Settings</span>
                  </Link>
                </li>
              </ul>
            </>
          ) : null}

          {showProjectNav && projectNavBase ? (
            <>
              {sectionHeader("Projects", false)}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={projectNavBase}
                    className={linkClass(projectOverviewActive)}
                    title={visuallyCollapsed ? "Project Overview" : undefined}
                    onClick={onMobileClose}
                  >
                    <LayoutGridIcon />
                    <span className={navLabelClass}>Project Overview</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${projectNavBase}/risks`}
                    className={linkClass(risksActive)}
                    title={visuallyCollapsed ? "Risks" : undefined}
                    onClick={onMobileClose}
                  >
                    <AlertIcon />
                    <span className={navLabelClass}>Risks</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${projectNavBase}/simulation`}
                    className={linkClass(simulationActive)}
                    title={visuallyCollapsed ? "Simulation" : undefined}
                    onClick={onMobileClose}
                  >
                    <SimulationIcon />
                    <span className={navLabelClass}>Simulation</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${projectNavBase}/settings`}
                    className={linkClass(projectSettingsActive)}
                    title={visuallyCollapsed ? "Project Settings" : undefined}
                    onClick={onMobileClose}
                  >
                    <CogIcon />
                    <span className={navLabelClass}>Project Settings</span>
                  </Link>
                </li>
              </ul>
            </>
          ) : null}

          {showProjectNav && projectNavBase && showDebugNav ? (
            <>
              {sectionHeader("De-Bug", false)}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={`${projectNavBase}/run-data`}
                    className={linkClass(runDataActive)}
                    title={visuallyCollapsed ? "Run Data" : undefined}
                    onClick={onMobileClose}
                  >
                    <FileIcon />
                    <span className={navLabelClass}>Run Data</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${projectNavBase}/engine-health`}
                    className={linkClass(healthActive)}
                    title={visuallyCollapsed ? "Engine Health" : undefined}
                    onClick={onMobileClose}
                  >
                    <EngineIcon />
                    <span className={navLabelClass}>Engine Health</span>
                  </Link>
                </li>
              </ul>
            </>
          ) : null}
        </nav>

        <div className="relative flex min-h-12 shrink-0 items-center px-[var(--ds-space-2)] py-[var(--ds-space-2)]">
          <div
            className="pointer-events-none absolute left-[var(--ds-space-2)] right-[var(--ds-space-2)] top-0 h-px bg-[var(--ds-border-subtle)]"
            aria-hidden
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ds-sidebar-collapse-btn !h-auto w-full min-w-0 !justify-start !gap-0 rounded-[var(--ds-radius-sm)] px-3 py-1 font-medium"
            aria-pressed={!collapsed}
            title={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
            aria-label={collapsed ? "Pin sidebar open" : "Collapse sidebar"}
            onClick={() =>
              setCollapsed((c) => {
                const next = !c;
                const pinned = !next;
                try {
                  localStorage.setItem(SIDENAV_KEY, pinned ? "true" : "false");
                } catch {
                  /* silent */
                }
                setSideNavPinnedCookie(pinned);
                void persistSideNavPinnedToSupabase(pinned);
                return next;
              })
            }
          >
            {collapsed ? <PinOpenIcon /> : <PanelLeftIcon />}
            <span className={navLabelClass}>{collapsed ? "Pin open" : "Collapse"}</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
