"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  RAIL_NAV_ROW_ACTIVE_CLASS,
  RAIL_NAV_ROW_INACTIVE_CLASS,
  RAIL_NAV_ROW_SHELL_CLASS,
  railLabelClass,
} from "@visualify/app-shell";
import { LogoutButton } from "@/components/LogoutButton";

const TEMPLATE_RAIL_PINNED_KEY = "template-app-platform-rail-pinned";

const RAIL_PAD_X = "px-[14px]";
const RAIL_BRAND_TEXT_CLASS =
  "text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight";
const RAIL_EXPANDED_W_CLASS = "w-[68px] hover:w-[min(240px,calc(100vw-16px))]";
const RAIL_HOVER_TIMING = "duration-[400ms] ease-out will-change-[width]";

function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return pathname === pathOnly || (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`));
}

function railFooterControlRowClass(active: boolean): string {
  return (
    `${RAIL_NAV_ROW_SHELL_CLASS}${active ? RAIL_NAV_ROW_ACTIVE_CLASS : RAIL_NAV_ROW_INACTIVE_CLASS}` +
    " cursor-pointer border-0 text-left no-underline " +
    (active ? "" : "bg-transparent ")
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
      <rect width={18} height={18} x={3} y={3} rx={2} />
      <path d="M9 3v18" />
    </svg>
  );
}

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
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <rect width={18} height={18} x={3} y={3} rx={2} />
      <path d="M9 3v18" />
      <path d="m14 8-4 4 4 4" />
    </svg>
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
 * Minimal platform-style rail for the template product app: brand, app name, primary nav, sign out.
 * Width and hover behaviour align with HQ `PlatformRail` without workspace or app catalog UI.
 */
export function TemplateAppShellRail() {
  const pathname = usePathname();
  const [railPinned, setRailPinned] = useState(false);
  const skipInitialPersist = useRef(true);

  const hqAppsUrl = process.env.NEXT_PUBLIC_HQ_APPS_URL?.trim() || "/";

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(TEMPLATE_RAIL_PINNED_KEY) === "true";
      if (stored) {
        queueMicrotask(() => {
          if (!cancelled) setRailPinned(true);
        });
      }
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(TEMPLATE_RAIL_PINNED_KEY, railPinned ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [railPinned]);

  const widthClass = railPinned ? "w-[min(240px,calc(100vw-16px))]" : RAIL_EXPANDED_W_CLASS;

  return (
    <aside
      data-pinned={railPinned ? "true" : undefined}
      className={
        `group relative z-30 flex min-h-dvh shrink-0 flex-col self-stretch overflow-visible bg-transparent ${widthClass} ` +
        `transition-[width] ${RAIL_HOVER_TIMING} ` +
        "rounded-br-[var(--ds-radius-lg)] rounded-tr-[var(--ds-radius-lg)]"
      }
      aria-label="Template App navigation"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${RAIL_PAD_X} pt-5`}>
        <div className="flex flex-col gap-2.5">
          <Link
            href={hqAppsUrl}
            title="Visualify apps"
            aria-label="Visualify apps"
            className={
              "flex h-10 w-full min-w-0 flex-1 items-center gap-0 rounded-[var(--ds-radius-md)] no-underline " +
              "transition-[color,gap] duration-[400ms] ease-out " +
              "group-hover:gap-2 group-data-[pinned=true]:gap-2 " +
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)] " +
              "text-[var(--ds-text-primary)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_5%,var(--ds-canvas))]"
            }
          >
            <span className="flex size-10 shrink-0 items-center justify-center">
              <BrandMonogramSymbol />
            </span>
            <span
              className={
                `hidden min-w-0 flex-1 items-center justify-start gap-1.5 overflow-hidden text-left ${RAIL_BRAND_TEXT_CLASS} ` +
                "group-hover:flex group-data-[pinned=true]:flex"
              }
            >
              <span className="shrink-0 whitespace-nowrap">Visualify</span>
              <span
                className="shrink-0 whitespace-nowrap text-[color-mix(in_oklab,var(--ds-text-tertiary)_88%,transparent)]"
                aria-hidden
              >
                |
              </span>
              <span className="min-w-0 truncate whitespace-nowrap">Template App</span>
            </span>
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
          </nav>
        </div>

        <div className="mt-auto flex min-h-0 w-full flex-col pt-5 pb-2 sm:pb-2.5">
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
            className={
              "vf-app-shell-rail-footer-account-outer mt-2 w-full max-w-10 shrink-0 " +
              "transition-[max-width] duration-[400ms] ease-out group-hover:max-w-none group-data-[pinned=true]:max-w-none"
            }
          >
            <div className="vf-app-shell-rail-footer-account-strip">
              <LogoutButton variant="rail" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
