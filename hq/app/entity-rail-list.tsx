"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { setVisualifyActiveWorkspaceIdAction } from "./workspace-switcher-actions";
import { groupEntitiesForRail, type EntityRailWorkspace } from "@/lib/entity-rail-grouping";
import {
  RAIL_NAV_ROW_ACTIVE_CLASS,
  RAIL_NAV_ROW_INACTIVE_CLASS,
  RAIL_NAV_ROW_SHELL_CLASS,
  railLabelClass,
} from "./rail-nav-row-classes";

/**
 * Workspace rows share nav chrome with primary links but should only show the filled “active” treatment on
 * workspace-admin routes — on Dashboard / Account they match inactive primary links (secondary text, no surface fill).
 */
function pathnameShowsWorkspaceRowActiveChrome(pathname: string): boolean {
  const prefixes = ["/hq/workspaces", "/workspace-settings", "/apps", "/billing", "/users"] as const;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function IconWorkspace() {
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

/** Mirrors RiskAI `Sidebar.tsx` `sectionHeader` — rule when collapsed, label when hover/pinned (`group` on `PlatformRail` aside). */
function RailSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={
        "ds-sidebar-section-header px-3 pb-1 pt-4 first:pt-1 [&:not(:first-child)]:mt-1"
      }
    >
      <div className="relative">
        <div
          className={
            "pointer-events-none absolute left-0 top-1/2 z-0 h-px w-full max-w-10 shrink-0 -translate-y-1/2 " +
            "bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out " +
            "group-hover:hidden group-data-[pinned=true]:hidden"
          }
          aria-hidden
        />
        <span
          className={
            "ds-sidebar-section-header-label relative z-10 block overflow-hidden whitespace-nowrap " +
            "transition-[max-width,opacity] duration-[400ms] ease-out " +
            "max-w-0 opacity-0 " +
            "group-hover:max-w-[min(12rem,100%)] group-hover:opacity-100 " +
            "group-data-[pinned=true]:max-w-[min(12rem,100%)] group-data-[pinned=true]:opacity-100"
          }
        >
          {children}
        </span>
      </div>
    </div>
  );
}

function WorkspaceRow({
  id,
  label,
  usesActiveChrome,
  disabled,
  onSelect,
}: {
  id: string;
  label: string;
  usesActiveChrome: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={usesActiveChrome ? "true" : undefined}
      title={label}
      aria-label={label}
      onClick={() => onSelect(id)}
      className={
        RAIL_NAV_ROW_SHELL_CLASS +
        (usesActiveChrome ? RAIL_NAV_ROW_ACTIVE_CLASS : RAIL_NAV_ROW_INACTIVE_CLASS) +
        " cursor-pointer border-0 text-left no-underline " +
        (!usesActiveChrome ? "bg-transparent " : "") +
        (disabled ? "opacity-60 " : "")
      }
    >
      <span className="flex size-10 shrink-0 items-center justify-center">
        <IconWorkspace />
      </span>
      <span className={railLabelClass}>{label}</span>
    </button>
  );
}

export function WorkspaceRailList({
  workspaces,
  selectedWorkspaceId,
}: {
  workspaces: EntityRailWorkspace[];
  selectedWorkspaceId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const workspaceChromeActive = pathnameShowsWorkspaceRowActiveChrome(pathname);

  async function selectWorkspace(id: string) {
    if (busyId) return;
    setBusyId(id);
    const result = await setVisualifyActiveWorkspaceIdAction(id);
    setBusyId(null);
    if (result.ok) {
      router.push(`/hq/workspaces/${id}`);
      router.refresh();
    }
  }

  function renderRows(items: { id: string; name: string }[]) {
    return items.map((w) => (
      <WorkspaceRow
        key={w.id}
        id={w.id}
        label={w.name}
        usesActiveChrome={workspaceChromeActive && selectedWorkspaceId === w.id}
        disabled={busyId !== null}
        onSelect={selectWorkspace}
      />
    ));
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        <RailSectionLabel>Workspaces</RailSectionLabel>
        <p className="px-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-tertiary)]">
          No workspaces to manage.
        </p>
      </div>
    );
  }

  const groups = groupEntitiesForRail(workspaces);

  return (
    <div className="flex flex-col gap-2.5">
      {groups.kind === "single" ? (
        <>
          <RailSectionLabel>{groups.label}</RailSectionLabel>
          <div className="flex flex-col gap-2.5">{renderRows(groups.items)}</div>
        </>
      ) : (
        <>
          <RailSectionLabel>Personal</RailSectionLabel>
          <div className="flex flex-col gap-2.5">{renderRows(groups.personal)}</div>
          <RailSectionLabel>Workspaces</RailSectionLabel>
          <div className="flex flex-col gap-2.5">{renderRows(groups.nonPersonal)}</div>
        </>
      )}
    </div>
  );
}

/** @deprecated Use {@link WorkspaceRailList} */
export const EntityRailList = WorkspaceRailList;
