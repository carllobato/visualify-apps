"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  appShellRailIconWellClassName,
  appShellRailNavActionButtonProps,
  railBrandTitleClass,
} from "@visualify/app-shell";

/** Matches {@link AppShellRailBrandAppMenu} — not exported from app-shell package. */
const RAIL_MOBILE_OPEN_ROW_GAP = "max-md:group-data-[mobile-open=true]:gap-2";
const RAIL_MOBILE_OPEN_FLEX_REVEAL = "max-md:group-data-[mobile-open=true]:flex";
import { setControlAiActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { CONTROLAI_ROUTES } from "@/lib/controlai-routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

const RAIL_MINI_LINK_CLASS =
  "text-left text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)] underline underline-offset-2 hover:text-[var(--ds-text-primary)]";

function workspaceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function WorkspaceInitialAvatar({ name }: { name: string }) {
  return (
    <span
      className="flex size-[25px] shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-semibold text-[var(--ds-text-secondary)]"
      aria-hidden
    >
      {workspaceInitials(name)}
    </span>
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

export function ControlAiWorkspaceRailList({
  workspaces,
  selectedWorkspaceId,
}: {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
}) {
  const router = useRouter();
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
    const result = await setControlAiActiveWorkspaceIdAction(id);
    setBusyId(null);
    setMenuOpen(false);
    if (result.ok) {
      router.refresh();
    }
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-1 px-0">
        <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-tertiary)]">
          No ControlAI workspaces are available for your account.
        </p>
        <Link href={CONTROLAI_ROUTES.account} className={RAIL_MINI_LINK_CLASS}>
          Account
        </Link>
      </div>
    );
  }

  if (workspaces.length === 1) {
    const only = workspaces[0]!;
    return (
      <div className={RAIL_BRAND_ROW_WRAP_CLASS}>
        <div
          className={RAIL_BRAND_ROW_TRIGGER_CLASS + " cursor-default"}
          aria-label={`${only.name}, workspace`}
          title={only.name}
        >
          <span className={appShellRailIconWellClassName}>
            <WorkspaceInitialAvatar name={only.name} />
          </span>
          <span className={RAIL_BRAND_ROW_LABEL_CLASS}>
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[var(--ds-text-primary)]">
              {only.name}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={RAIL_BRAND_ROW_WRAP_CLASS}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={RAIL_BRAND_ROW_TRIGGER_CLASS + (busyId ? " opacity-60" : "")}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label="Active workspace"
        title="Workspace"
        disabled={busyId !== null}
        onClick={() => setMenuOpen((open) => !open)}
        {...appShellRailNavActionButtonProps}
      >
        <span className={appShellRailIconWellClassName}>
          <WorkspaceInitialAvatar name={triggerLabel} />
        </span>
        <span className={RAIL_BRAND_ROW_LABEL_CLASS}>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[var(--ds-text-primary)]">
            {triggerLabel}
          </span>
          <span
            className={
              "flex shrink-0 items-center text-[color-mix(in_oklab,var(--ds-text-secondary)_58%,transparent)] " +
              "opacity-[0.85] transition-[opacity,color] duration-150 ease-out"
            }
          >
            <IconChevronDownSubtle />
          </span>
        </span>
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
