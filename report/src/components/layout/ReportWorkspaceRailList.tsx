"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  appShellRailIconWellClassName,
  appShellRailNavActionButtonProps,
  railBrandTitleClass,
} from "@visualify/app-shell";

/** Matches {@link AppShellRailBrandAppMenu} — not exported from app-shell package. */
const RAIL_MOBILE_OPEN_ROW_GAP = "max-md:group-data-[mobile-open=true]:gap-2";
const RAIL_MOBILE_OPEN_FLEX_REVEAL = "max-md:group-data-[mobile-open=true]:flex";
import { setReportActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { REPORT_ROUTES } from "@/lib/report-routes";
import { WorkspaceAvatar } from "@/components/workspace/WorkspaceAvatar.client";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

const RAIL_MINI_LINK_CLASS =
  "text-left text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)] underline underline-offset-2 hover:text-[var(--ds-text-primary)]";

function workspaceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function WorkspaceRailAvatar({ workspace }: { workspace: EntitledWorkspace }) {
  return (
    <WorkspaceAvatar
      size="rail"
      websiteUrl={workspace.website_url}
      logoUrl={workspace.logo_url}
      avatarInitials={workspaceInitials(workspace.name)}
    />
  );
}

function IconChevronDownSubtle() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
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

const RAIL_BRAND_ROW_WRAP_CLASS =
  "relative flex h-10 w-full min-w-0 shrink-0 items-center gap-0 rounded-[var(--ds-radius-md)] transition-[gap] duration-[400ms] ease-out group-hover:gap-2 group-data-[pinned=true]:gap-2 " +
  RAIL_MOBILE_OPEN_ROW_GAP;

const RAIL_BRAND_ROW_TRIGGER_CLASS =
  "relative flex h-10 min-h-0 min-w-0 flex-1 items-center gap-0 rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 text-left " +
  "transition-[color,gap] duration-[400ms] ease-out " +
  "group-hover:gap-2 group-data-[pinned=true]:gap-2 " +
  RAIL_MOBILE_OPEN_ROW_GAP +
  " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]";

const RAIL_BRAND_ROW_LABEL_CLASS =
  `hidden min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden text-left ${railBrandTitleClass} ` +
  "group-hover:flex group-data-[pinned=true]:flex " +
  RAIL_MOBILE_OPEN_FLEX_REVEAL;

const RAIL_WORKSPACE_HOME_LINK_CLASS =
  RAIL_BRAND_ROW_TRIGGER_CLASS +
  " min-w-0 flex-1 no-underline text-[var(--ds-text-primary)] " +
  "hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_5%,var(--ds-canvas))] hover:text-[var(--ds-text-primary)]";

const RAIL_WORKSPACE_MENU_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 " +
  "text-[color-mix(in_oklab,var(--ds-text-secondary)_58%,transparent)] transition-[color,background-color] duration-150 ease-out " +
  "hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_5%,var(--ds-canvas))] hover:text-[var(--ds-text-primary)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function ReportWorkspaceRailList({
  workspaces,
  selectedWorkspaceId,
}: {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) ?? workspaces[0] ?? null;

  const triggerLabel =
    selectedWorkspace?.name ??
    (workspaces.length > 1 ? "Workspace" : workspaces[0]?.name ?? "Workspace");

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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
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

  async function selectWorkspace(id: string) {
    if (busyId || id === selectedWorkspaceId) {
      setMenuOpen(false);
      return;
    }
    setBusyId(id);
    const result = await setReportActiveWorkspaceIdAction(id);
    setBusyId(null);
    setMenuOpen(false);
    if (result.ok) {
      router.push(REPORT_ROUTES.projects);
      router.refresh();
    }
  }

  function workspaceHomeActive(): boolean {
    return pathname === REPORT_ROUTES.projects;
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-1 px-0">
        <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-tertiary)]">
          No Report workspaces are available for your account.
        </p>
        <Link href={REPORT_ROUTES.account} className={RAIL_MINI_LINK_CLASS}>
          Account
        </Link>
      </div>
    );
  }

  if (workspaces.length === 1) {
    const only = workspaces[0]!;
    return (
      <div className={RAIL_BRAND_ROW_WRAP_CLASS}>
        <Link
          href={REPORT_ROUTES.projects}
          className={RAIL_WORKSPACE_HOME_LINK_CLASS}
          aria-label={`${only.name}, workspace home`}
          aria-current={workspaceHomeActive() ? "page" : undefined}
          title={only.name}
        >
          <span className={appShellRailIconWellClassName}>
            <WorkspaceRailAvatar workspace={only} />
          </span>
          <span className={RAIL_BRAND_ROW_LABEL_CLASS}>
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[var(--ds-text-primary)]">
              {only.name}
            </span>
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={RAIL_BRAND_ROW_WRAP_CLASS}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={REPORT_ROUTES.projects}
        className={RAIL_WORKSPACE_HOME_LINK_CLASS + (busyId ? " pointer-events-none opacity-60" : "")}
        aria-label={`${triggerLabel}, workspace home`}
        aria-current={workspaceHomeActive() ? "page" : undefined}
        title={triggerLabel}
        onClick={() => setMenuOpen(false)}
      >
        <span className={appShellRailIconWellClassName}>
          {selectedWorkspace ? (
            <WorkspaceRailAvatar workspace={selectedWorkspace} />
          ) : (
            <WorkspaceAvatar
              size="rail"
              websiteUrl={null}
              logoUrl={null}
              avatarInitials={workspaceInitials(triggerLabel)}
            />
          )}
        </span>
        <span className={RAIL_BRAND_ROW_LABEL_CLASS}>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[var(--ds-text-primary)]">
            {triggerLabel}
          </span>
        </span>
      </Link>

      <button
        type="button"
        className={RAIL_WORKSPACE_MENU_BUTTON_CLASS}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label="Switch workspace"
        title="Switch workspace"
        disabled={busyId !== null}
        onClick={() => setMenuOpen((open) => !open)}
        {...appShellRailNavActionButtonProps}
      >
        <IconChevronDownSubtle />
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          aria-label="Workspaces"
          className="absolute inset-x-0 top-full z-[100] mt-[var(--ds-space-1)] w-full min-w-0 ds-app-menu-dropdown"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          <div
            className="px-[var(--ds-space-4)] pb-[var(--ds-space-2)] pt-[var(--ds-space-3)]"
            role="presentation"
          >
            <div className="text-[length:var(--ds-text-xs)] font-normal leading-snug text-[var(--ds-text-secondary)]">
              Workspace
            </div>
            <div className="mt-[var(--ds-space-1)] truncate text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
              {selectedWorkspace?.name ?? "Select a workspace"}
            </div>
          </div>

          {workspaces.map((workspace) => {
            const isSelected = workspace.id === selectedWorkspaceId;
            return (
              <button
                key={workspace.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={busyId !== null}
                className="ds-app-menu-dropdown__item text-left"
                onClick={() => void selectWorkspace(workspace.id)}
                {...appShellRailNavActionButtonProps}
              >
                {workspace.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
