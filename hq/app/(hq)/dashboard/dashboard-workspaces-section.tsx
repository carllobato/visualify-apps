"use client";

import { dsAppLaunchTileInteractiveClass } from "@visualify/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setVisualifyActiveWorkspaceIdAction } from "../../workspace-switcher-actions";

type WorkspaceRow = { id: string; name: string; workspace_type: string };

function workspaceTypeLabel(type: string): string {
  const t = type.trim().toLowerCase();
  if (t === "personal") return "Personal";
  if (t === "team" || t === "organization" || t === "organisation") return "Organisation";
  return type.trim() || "Workspace";
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
      router.push(`/hq/workspaces/${id}`);
      router.refresh();
    }
  }

  if (workspaces.length === 0) {
    return (
      <section aria-labelledby="dashboard-workspaces-heading" className="space-y-4">
        <h2
          id="dashboard-workspaces-heading"
          className="text-[length:var(--ds-text-lg)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Workspaces
        </h2>
        <p className="max-w-xl text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          No workspaces to manage. When you can administer a workspace, it will show up here and in the rail.
        </p>
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
                <span className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                  {w.name}
                </span>
                <span className="mt-2 flex-1 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  {workspaceTypeLabel(w.workspace_type)}
                  {active ? (
                    <span className="mt-1 block text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-tertiary)]">
                      Active in HQ
                    </span>
                  ) : null}
                </span>
                <span className="mt-3 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                  {pending ? "Opening…" : "Manage"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
