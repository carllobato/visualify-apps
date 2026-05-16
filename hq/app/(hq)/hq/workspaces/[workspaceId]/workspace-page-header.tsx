"use client";

import { useState } from "react";
import { resolveWorkspaceFaviconUrl } from "@/lib/workspace-favicon";

const AVATAR_IMAGE_CLASS =
  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ds-radius-md)]";

const AVATAR_FALLBACK_SHELL_CLASS =
  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ds-radius-md)] " +
  "bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,var(--ds-surface-default))] ring-1 ring-[var(--ds-border)]";

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
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--ds-text-tertiary)]">
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

/** Google favicon from `website_url`; then initials/icon. */
function WorkspacePageAvatar({
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
        width={44}
        height={44}
        className={`${AVATAR_IMAGE_CLASS} object-contain`}
        onError={() => setShowFavicon(false)}
      />
    );
  }

  const initials = workspaceInitials(workspaceName);
  if (initials) {
    return (
      <span
        className={`${AVATAR_FALLBACK_SHELL_CLASS} text-[length:var(--ds-text-sm)] font-medium tracking-tight text-[var(--ds-text-secondary)]`}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <span className={AVATAR_FALLBACK_SHELL_CLASS} aria-hidden>
      <IconWorkspace />
    </span>
  );
}

export function WorkspacePageHeader({
  workspaceName,
  websiteUrl,
}: {
  workspaceName: string;
  websiteUrl: string | null;
}) {
  return (
    <header className="mb-2 flex items-center gap-3">
      <WorkspacePageAvatar websiteUrl={websiteUrl} workspaceName={workspaceName} />
      <h1 className="min-w-0 text-2xl font-semibold text-[var(--ds-text-primary)]">
        {workspaceName} Workspace
      </h1>
    </header>
  );
}
