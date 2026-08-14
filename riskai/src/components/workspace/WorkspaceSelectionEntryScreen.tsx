"use client";

import { useState } from "react";
import { AppLoginFramedShell } from "@visualify/app-shell";
import { setRiskAiActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { DASHBOARD_PATH } from "@/lib/routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

const workspaceButtonClass =
  "w-full cursor-pointer rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-3 text-left text-sm font-semibold text-[var(--ds-text-primary)] transition-[background-color,border-color] duration-200 ease-out hover:border-[var(--ds-border)] hover:bg-[var(--ds-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border)] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Post-auth entry gate when the user has 2+ entitled workspaces and no valid
 * `visualify_active_workspace_id`. Selection uses {@link setRiskAiActiveWorkspaceIdAction}.
 */
export function WorkspaceSelectionEntryScreen({
  workspaces,
}: {
  workspaces: readonly EntitledWorkspace[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectWorkspace(workspaceId: string) {
    if (busyId) return;
    setError(null);
    setBusyId(workspaceId);
    try {
      const result = await setRiskAiActiveWorkspaceIdAction(workspaceId);
      if (!result.ok) {
        setError("Could not select that workspace. Please try again.");
        setBusyId(null);
        return;
      }
      window.location.assign(DASHBOARD_PATH);
    } catch {
      setError("Could not select that workspace. Please try again.");
      setBusyId(null);
    }
  }

  return (
    <AppLoginFramedShell brandHref="/" brandTitle="Visualify RiskAI" brandAriaLabel="Visualify RiskAI">
      <div className="w-full space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ds-text-primary)]">
          Select a workspace
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Choose which workspace to open in RiskAI.
        </p>

        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-left" aria-label="Workspaces">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <button
                type="button"
                className={workspaceButtonClass}
                disabled={busyId !== null}
                aria-busy={busyId === workspace.id}
                onClick={() => void selectWorkspace(workspace.id)}
              >
                {busyId === workspace.id ? "Opening…" : workspace.name}
              </button>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="m-0 text-sm text-[var(--ds-status-danger-fg)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </AppLoginFramedShell>
  );
}
