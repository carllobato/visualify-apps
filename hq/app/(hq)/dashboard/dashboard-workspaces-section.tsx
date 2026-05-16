"use client";

import { dsAppLaunchTileInteractiveClass } from "@visualify/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveWorkspaceFaviconUrl } from "@/lib/workspace-favicon";
import { setVisualifyActiveWorkspaceIdAction } from "../../workspace-switcher-actions";

type WorkspaceRow = {
  id: string;
  name: string;
  website_url: string | null;
};

const TILE_AVATAR_IMAGE_CLASS =
  "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ds-radius-md)]";

const TILE_AVATAR_FALLBACK_SHELL_CLASS =
  "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ds-radius-md)] " +
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
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--ds-text-tertiary)]">
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
        width={36}
        height={36}
        className={`${TILE_AVATAR_IMAGE_CLASS} object-contain`}
        onError={() => setShowFavicon(false)}
      />
    );
  }

  const initials = workspaceInitials(workspaceName);
  if (initials) {
    return (
      <span
        className={`${TILE_AVATAR_FALLBACK_SHELL_CLASS} text-[length:var(--ds-text-xs)] font-medium tracking-tight text-[var(--ds-text-secondary)]`}
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

export function DashboardWorkspacesSection({
  workspaces,
  selectedWorkspaceId,
}: {
  workspaces: WorkspaceRow[];
  selectedWorkspaceId: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function openWorkspace(id: string) {
    if (busyId) return;
    setBusyId(id);
    const result = await setVisualifyActiveWorkspaceIdAction(id);
    setBusyId(null);
    if (result.ok) {
      router.push(`/hq/workspaces/${id}?tab=apps`);
      router.refresh();
    }
  }

  if (workspaces.length === 0) {
    const ctaClass =
      "inline-flex min-h-10 items-center justify-center rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] " +
      "bg-[var(--ds-surface-default)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] no-underline " +
      "shadow-[var(--ds-shadow-sm)] transition-colors hover:bg-[var(--ds-surface-hover)]";

    return (
      <section aria-labelledby="dashboard-workspaces-heading" className="space-y-4">
        <h2
          id="dashboard-workspaces-heading"
          className="text-[length:var(--ds-text-lg)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Workspaces
        </h2>
        <div className="max-w-xl space-y-4 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-4">
          <p className="m-0 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            You don&apos;t administer any workspaces yet. Apps and subscriptions are enabled per workspace—create
            one to get started, or join an existing workspace when an admin invites you.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/create-workspace" className={ctaClass}>
              Create Workspace
            </Link>
            <Link href="/account" className={ctaClass}>
              Join Workspace
            </Link>
          </div>
          <p className="m-0 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-tertiary)]">
            Workspace creation and invitations are coordinated from Organisation and your account; flows will
            expand here over time.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="dashboard-workspaces-heading" className="space-y-4">
      <h2
        id="dashboard-workspaces-heading"
        className="text-[length:var(--ds-text-lg)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
      >
        Workspaces
      </h2>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((w) => {
          const active = selectedWorkspaceId === w.id;
          const pending = busyId === w.id;

          return (
            <li key={w.id} className="min-w-0">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => openWorkspace(w.id)}
                className={
                  dsAppLaunchTileInteractiveClass +
                  " w-full cursor-pointer text-left disabled:pointer-events-none disabled:opacity-60"
                }
                aria-current={active ? "true" : undefined}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <DashboardWorkspaceTileAvatar websiteUrl={w.website_url} workspaceName={w.name} />
                  <span className="min-w-0 truncate text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                    {w.name}
                  </span>
                </span>
                <span className="mt-3 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                  {pending ? "Opening…" : "Manage"}
                </span>
              </button>
            </li>
          );
        })}
        <li key="create-workspace" className="min-w-0">
          <Link
            href="/create-workspace"
            className={
              dsAppLaunchTileInteractiveClass +
              " w-full border border-dashed border-[var(--ds-border)] bg-transparent shadow-none " +
              "hover:-translate-y-px hover:bg-[var(--ds-surface-muted)] hover:shadow-none"
            }
          >
            <span className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
              Create workspace
            </span>
            <span className="mt-3 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
              Create
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
