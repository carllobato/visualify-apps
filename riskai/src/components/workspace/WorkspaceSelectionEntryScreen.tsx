"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  clearAppShellRouteTransitionState,
  navigateAfterAppShellRouteTransition,
} from "@visualify/app-shell";
import { Button } from "@visualify/design-system";
import { setRiskAiActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { DASHBOARD_PATH, HOME_PATH, isWorkspaceSelectionPath, normalizeAppPath } from "@/lib/routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

function returnPathAfterSelection(next: string | null): string {
  const raw = normalizeAppPath(next, DASHBOARD_PATH);
  if (isWorkspaceSelectionPath(raw) || raw === HOME_PATH) {
    return DASHBOARD_PATH;
  }
  return raw;
}

/**
 * Workspace selector shown on `/home`. Selection uses
 * {@link setRiskAiActiveWorkspaceIdAction} and client-side navigation (no full reload).
 */
export function WorkspaceSelectionEntryScreen({
  workspaces,
  selectedWorkspaceId = null,
}: {
  workspaces: readonly EntitledWorkspace[];
  selectedWorkspaceId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      const destination = returnPathAfterSelection(searchParams.get("next"));
      if (pathname === destination || pathname === `${destination}/`) {
        router.refresh();
        return;
      }
      await navigateAfterAppShellRouteTransition(router, destination, { replace: true });
    } catch {
      clearAppShellRouteTransitionState();
      setError("Could not select that workspace. Please try again.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ds-text-primary)]">
          Select a workspace
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Choose which workspace to open in RiskAI. You can change this anytime from the left rail.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-left" aria-label="Workspaces">
        {workspaces.map((workspace) => {
          const isSelected = workspace.id === selectedWorkspaceId;
          return (
            <li key={workspace.id}>
              <Button
                type="button"
                variant="secondary"
                className="h-auto w-full justify-between gap-3 px-4 py-3 text-left"
                disabled={busyId !== null}
                aria-busy={busyId === workspace.id}
                onClick={() => void selectWorkspace(workspace.id)}
              >
                <span className="min-w-0 truncate">
                  {busyId === workspace.id ? "Opening…" : workspace.name}
                </span>
                {isSelected && busyId !== workspace.id ? (
                  <span className="shrink-0 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">
                    Last used
                  </span>
                ) : null}
              </Button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="m-0 text-sm text-[var(--ds-status-danger-fg)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
