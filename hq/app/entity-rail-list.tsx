"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { setVisualifyActiveWorkspaceIdAction } from "./workspace-switcher-actions";
import { groupEntitiesForRail, workspaceTypeDisplayLabel, type EntityRailWorkspace } from "@/lib/entity-rail-grouping";
import { WorkspaceAvatar } from "@/components/workspace-avatar.client";
import {
  AppShellRailNavSection,
  appShellRailIconWellClassName,
  appShellRailNavButtonRowClass,
  railLabelClass,
} from "@visualify/app-shell";

/**
 * Workspace rows share nav chrome with primary links but should only show the filled “active” treatment on
 * workspace-admin routes — on Dashboard / Account they match inactive primary links (secondary text, no surface fill).
 */
function pathnameShowsWorkspaceRowActiveChrome(pathname: string): boolean {
  const prefixes = ["/workspaces", "/workspace-settings", "/apps", "/billing", "/users"] as const;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const RAIL_MINI_LINK_CLASS =
  "text-left text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)] underline underline-offset-2 hover:text-[var(--ds-text-primary)]";

function workspaceRowAriaLabel(name: string, typeLabel: string, isSelected: boolean): string {
  const parts = [name, typeLabel];
  if (isSelected) parts.push("active workspace");
  return parts.join(", ");
}

function WorkspaceRow({
  id,
  name,
  workspaceType,
  websiteUrl,
  logoUrl,
  avatarInitials,
  isSelected,
  usesActiveChrome,
  disabled,
  onSelect,
}: {
  id: string;
  name: string;
  workspaceType: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  avatarInitials: string | null;
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
        appShellRailNavButtonRowClass(usesActiveChrome, {
          transparentWhenInactive: !usesActiveChrome,
        }) + (disabled ? " opacity-60" : "")
      }
    >
      <span className={appShellRailIconWellClassName}>
        <WorkspaceAvatar
          size="rail"
          logoUrl={logoUrl}
          websiteUrl={websiteUrl}
          avatarInitials={avatarInitials}
        />
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
    try {
      const result = await setVisualifyActiveWorkspaceIdAction(id);
      if (!result.ok) return;

      router.push(`/workspaces/${id}`);
    } finally {
      setBusyId(null);
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
          logoUrl={w.logo_url}
          avatarInitials={w.avatarInitials}
          isSelected={isSelected}
          usesActiveChrome={workspaceChromeActive && isSelected}
          disabled={busyId !== null}
          onSelect={() => selectWorkspace(w.id)}
        />
      );
    });
  }

  if (workspaces.length === 0) {
    return (
      <AppShellRailNavSection label="WORKSPACES">
        <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-tertiary)]">
          No workspaces yet.
        </p>
        <Link href="/account" className={RAIL_MINI_LINK_CLASS}>
          Join Workspace
        </Link>
      </AppShellRailNavSection>
    );
  }

  const { items } = groupEntitiesForRail(workspaces);

  return <AppShellRailNavSection label="WORKSPACES">{renderRows(items)}</AppShellRailNavSection>;
}

/** @deprecated Use {@link WorkspaceRailList} */
export const EntityRailList = WorkspaceRailList;
