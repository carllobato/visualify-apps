"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { WorkspaceDashboardEntry } from "@/lib/workspace-settings-data";
import { workspaceMemberRoleLabel, canManageWorkspaceInHq } from "@/lib/workspace-member-roles";
import { WorkspaceAvatar } from "@/components/workspace-avatar.client";
import { useDashboardOpenWorkspace } from "./dashboard-workspaces-open.client";

const documentTileShellClass = "ds-document-tile-panel ds-document-tile-panel--interactive";

function stopLauncherEventPropagation(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}

function IconSettings() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.49.77.85 1.3.91H21a2 2 0 1 1 0 4h-.09c-.53.06-1.1.42-1.3.91Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatMemberCount(count: number): string {
  return count === 1 ? "1 member" : `${count} members`;
}

function formatProductCount(count: number): string {
  return count === 1 ? "1 app" : `${count} apps`;
}

function workspaceMetaLine(w: WorkspaceDashboardEntry): string {
  return [
    workspaceMemberRoleLabel(w.memberRole),
    formatMemberCount(w.memberCount),
    formatProductCount(w.productCount),
  ].join(" · ");
}

export function DashboardWorkspaceTile({
  workspace,
  appShortcuts,
}: {
  workspace: WorkspaceDashboardEntry;
  appShortcuts: ReactNode;
}) {
  const { busyId, tilesDisabled, openWorkspace } = useDashboardOpenWorkspace();
  const pending = busyId === workspace.id;
  const canManage = canManageWorkspaceInHq(workspace.memberRole);
  const settingsHref = `/workspaces/${workspace.id}?tab=details`;
  const openLabel = pending ? `Opening ${workspace.name}` : `Open ${workspace.name}`;

  return (
    <article className={`${documentTileShellClass} ds-hq-workspace-launcher-tile`}>
      <button
        type="button"
        disabled={tilesDisabled}
        onClick={() => openWorkspace(workspace.id, canManage)}
        className="ds-hq-workspace-launcher-tile__open"
        aria-label={openLabel}
        aria-busy={pending || undefined}
      >
        <span className="ds-hq-workspace-launcher-tile__header">
          <WorkspaceAvatar
            logoUrl={workspace.logo_url}
            websiteUrl={workspace.website_url}
            avatarInitials={workspace.avatarInitials}
          />
          <span className="min-w-0 flex-1">
            <span className="ds-hq-workspace-launcher-tile__name">{workspace.name}</span>
            <span className="ds-hq-workspace-launcher-tile__meta">{workspaceMetaLine(workspace)}</span>
          </span>
        </span>
      </button>

      {canManage ? (
        <Link
          href={settingsHref}
          className="ds-hq-workspace-launcher-tile__settings"
          aria-label={`Settings for ${workspace.name}`}
          onClick={stopLauncherEventPropagation}
          onPointerDown={stopLauncherEventPropagation}
        >
          <IconSettings />
        </Link>
      ) : null}

      {appShortcuts}
    </article>
  );
}
