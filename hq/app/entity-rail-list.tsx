"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { setVisualifyActiveWorkspaceIdAction } from "./workspace-switcher-actions";
import {
  groupEntitiesForRail,
  isOrganisationWorkspaceType,
  workspaceTypeDisplayLabel,
  type EntityRailWorkspace,
} from "@/lib/entity-rail-grouping";
import { resolveWorkspaceFaviconUrl } from "@/lib/workspace-favicon";
import {
  RAIL_NAV_ROW_ACTIVE_CLASS,
  RAIL_NAV_ROW_INACTIVE_CLASS,
  RAIL_NAV_ROW_SHELL_CLASS,
  railLabelClass,
} from "@visualify/app-shell";

/**
 * Workspace rows share nav chrome with primary links but should only show the filled “active” treatment on
 * workspace-admin routes — on Dashboard / Account they match inactive primary links (secondary text, no surface fill).
 */
function pathnameShowsWorkspaceRowActiveChrome(pathname: string): boolean {
  const prefixes = ["/hq/workspaces", "/workspace-settings", "/apps", "/billing", "/users"] as const;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function IconWorkspace({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
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

function IconOrganisation({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M4 21h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M8 21V5h8v16"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 8h2M11 11h2M11 14h2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M11 17h2v4"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

const CREATE_WORKSPACE_ROW_INACTIVE_CLASS =
  "text-[var(--ds-text-tertiary)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_3%,var(--ds-canvas))] hover:text-[var(--ds-text-secondary)]";

const CREATE_WORKSPACE_ROW_ACTIVE_CLASS =
  "bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,var(--ds-canvas))] text-[var(--ds-text-secondary)] " +
  "hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_6%,var(--ds-canvas))] hover:text-[var(--ds-text-secondary)]";

const createWorkspaceLabelClass =
  railLabelClass.replace("font-medium", "font-normal");


const RAIL_MINI_LINK_CLASS =
  "text-left text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)] underline underline-offset-2 hover:text-[var(--ds-text-primary)]";

function CreateWorkspaceRailRow({ pathname }: { pathname: string }) {
  const active =
    pathname === "/create-workspace" || pathname.startsWith("/create-workspace/");
  const label = "Create workspace";

  return (
    <Link
      href="/create-workspace"
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={
        RAIL_NAV_ROW_SHELL_CLASS +
        (active ? CREATE_WORKSPACE_ROW_ACTIVE_CLASS : CREATE_WORKSPACE_ROW_INACTIVE_CLASS) +
        " no-underline bg-transparent"
      }
    >
      <span className="flex size-10 shrink-0 items-center justify-center opacity-80">
        <IconPlus />
      </span>
      <span className={createWorkspaceLabelClass}>{label}</span>
    </Link>
  );
}

function workspaceRowAriaLabel(name: string, typeLabel: string, isSelected: boolean): string {
  const parts = [name, typeLabel];
  if (isSelected) parts.push("active workspace");
  return parts.join(", ");
}

const RAIL_ROW_ICON_PX = 32;
const RAIL_ROW_FAVICON_CLASS =
  "size-8 shrink-0 rounded-[var(--ds-radius-sm)] object-contain";

/** Website favicon in the rail row; falls back to type icons on error or missing URL. */
function WorkspaceRowIcon({
  websiteUrl,
  workspaceType,
}: {
  websiteUrl: string | null;
  workspaceType: string;
}) {
  const faviconUrl = resolveWorkspaceFaviconUrl(websiteUrl);
  const [showFavicon, setShowFavicon] = useState(Boolean(faviconUrl));

  if (showFavicon && faviconUrl) {
    return (
      <img
        src={faviconUrl}
        alt=""
        width={RAIL_ROW_ICON_PX}
        height={RAIL_ROW_ICON_PX}
        className={RAIL_ROW_FAVICON_CLASS}
        onError={() => setShowFavicon(false)}
      />
    );
  }

  return isOrganisationWorkspaceType(workspaceType) ? (
    <IconOrganisation size={RAIL_ROW_ICON_PX} />
  ) : (
    <IconWorkspace size={RAIL_ROW_ICON_PX} />
  );
}

function WorkspaceRow({
  id,
  name,
  workspaceType,
  websiteUrl,
  isSelected,
  usesActiveChrome,
  disabled,
  onSelect,
}: {
  id: string;
  name: string;
  workspaceType: string;
  websiteUrl: string | null;
  isSelected: boolean;
  usesActiveChrome: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const typeLabel = workspaceTypeDisplayLabel(workspaceType);
  const ariaLabel = workspaceRowAriaLabel(name, typeLabel, isSelected);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={isSelected ? "true" : undefined}
      title={ariaLabel}
      aria-label={ariaLabel}
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
        <WorkspaceRowIcon websiteUrl={websiteUrl} workspaceType={workspaceType} />
      </span>
      <span className={railLabelClass}>{name}</span>
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
      router.push(`/hq/workspaces/${id}?tab=apps`);
      router.refresh();
    }
  }

  function renderRows(items: EntityRailWorkspace[]) {
    return items.map((w) => {
      const isSelected = selectedWorkspaceId === w.id;
      return (
        <WorkspaceRow
          key={w.id}
          id={w.id}
          name={w.name}
          workspaceType={w.workspace_type}
          websiteUrl={w.website_url}
          isSelected={isSelected}
          usesActiveChrome={workspaceChromeActive && isSelected}
          disabled={busyId !== null}
          onSelect={selectWorkspace}
        />
      );
    });
  }

  if (workspaces.length === 0) {
    return (
      <section className="flex min-w-0 flex-col gap-2.5 pt-1" aria-label="Workspaces">
        <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-tertiary)]">
          No workspaces to manage yet.
        </p>
        <CreateWorkspaceRailRow pathname={pathname} />
        <Link href="/account" className={RAIL_MINI_LINK_CLASS}>
          Join Workspace
        </Link>
      </section>
    );
  }

  const { label, items } = groupEntitiesForRail(workspaces);

  return (
    <section className="flex min-w-0 flex-col gap-2.5 pt-1" aria-label={label}>
      {renderRows(items)}
      <CreateWorkspaceRailRow pathname={pathname} />
    </section>
  );
}

/** @deprecated Use {@link WorkspaceRailList} */
export const EntityRailList = WorkspaceRailList;
