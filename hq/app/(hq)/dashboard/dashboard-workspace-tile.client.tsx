"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { WorkspaceDashboardEntry } from "@/lib/workspace-settings-data";
import { workspaceMemberRoleLabel } from "@/lib/workspace-member-roles";
import { resolveWorkspaceFaviconUrl } from "@/lib/workspace-favicon";
import { useDashboardOpenWorkspace } from "./dashboard-workspaces-open.client";

const documentTileShellClass = "ds-document-tile-panel ds-document-tile-panel--interactive";

const TILE_AVATAR_IMAGE_CLASS =
  "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ds-radius-sm)]";

const TILE_AVATAR_FALLBACK_SHELL_CLASS =
  "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ds-radius-sm)] " +
  "bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,var(--ds-surface-default))] ring-1 ring-[var(--ds-border)]";

function stopLauncherEventPropagation(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}

function workspaceInitials(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const word = parts[0];
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word.slice(0, 1).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function IconWorkspace() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--ds-text-tertiary)]">
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

function DashboardWorkspaceTileAvatar({
  websiteUrl,
  workspaceName,
}: {
  websiteUrl: string | null;
  workspaceName: string;
}) {
  const faviconUrl = resolveWorkspaceFaviconUrl(websiteUrl);
  const [showFavicon, setShowFavicon] = useState(Boolean(faviconUrl));

  if (showFavicon && faviconUrl) {
    return (
      <img
        src={faviconUrl}
        alt=""
        width={32}
        height={32}
        className={`${TILE_AVATAR_IMAGE_CLASS} object-contain`}
        onError={() => setShowFavicon(false)}
      />
    );
  }

  const initials = workspaceInitials(workspaceName);
  if (initials) {
    return (
      <span
        className={`${TILE_AVATAR_FALLBACK_SHELL_CLASS} text-[10px] font-medium tracking-tight text-[var(--ds-text-secondary)]`}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <span className={TILE_AVATAR_FALLBACK_SHELL_CLASS} aria-hidden>
      <IconWorkspace />
    </span>
  );
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
  const settingsHref = `/workspaces/${workspace.id}?tab=details`;
  const openLabel = pending ? `Opening ${workspace.name}` : `Open ${workspace.name}`;

  return (
    <article className={`${documentTileShellClass} ds-hq-workspace-launcher-tile`}>
      <button
        type="button"
        disabled={tilesDisabled}
        onClick={() => openWorkspace(workspace.id)}
        className="ds-hq-workspace-launcher-tile__open"
        aria-label={openLabel}
        aria-busy={pending || undefined}
      >
        <span className="ds-hq-workspace-launcher-tile__header">
          <DashboardWorkspaceTileAvatar websiteUrl={workspace.website_url} workspaceName={workspace.name} />
          <span className="min-w-0 flex-1">
            <span className="ds-hq-workspace-launcher-tile__name">{workspace.name}</span>
            <span className="ds-hq-workspace-launcher-tile__meta">{workspaceMetaLine(workspace)}</span>
          </span>
        </span>
      </button>

      <Link
        href={settingsHref}
        className="ds-hq-workspace-launcher-tile__settings"
        aria-label={`Settings for ${workspace.name}`}
        onClick={stopLauncherEventPropagation}
        onPointerDown={stopLauncherEventPropagation}
      >
        <IconSettings />
      </Link>

      {appShortcuts}
    </article>
  );
}
