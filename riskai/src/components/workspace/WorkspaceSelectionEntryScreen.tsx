"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  clearAppShellRouteTransitionState,
  navigateAfterAppShellRouteTransition,
} from "@visualify/app-shell";
import { Button, Callout, FieldError, Input, Label } from "@visualify/design-system";
import { setRiskAiActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import {
  CREATE_WORKSPACE_API_PATH,
  workspaceCreateSuccessPath,
} from "@/lib/workspace/createWorkspace.logic";
import { pathAfterWorkspaceSelection } from "@/lib/routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

/**
 * Workspace selector shown on `/home`. Selection uses
 * {@link setRiskAiActiveWorkspaceIdAction} and client-side navigation (no full reload).
 * Create Workspace is account-level and does not depend on the current Workspace role.
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createNameError, setCreateNameError] = useState<string | null>(null);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const busy = busyId !== null || creating;

  async function selectWorkspace(workspaceId: string) {
    if (busy) return;
    setError(null);
    setBusyId(workspaceId);
    try {
      const result = await setRiskAiActiveWorkspaceIdAction(workspaceId);
      if (!result.ok) {
        setError("Could not select that workspace. Please try again.");
        setBusyId(null);
        return;
      }
      const destination = pathAfterWorkspaceSelection(workspaceId, searchParams.get("next"));
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

  function openCreateWorkspace() {
    if (busy) return;
    setError(null);
    setCreateName("");
    setCreateNameError(null);
    setCreateFormError(null);
    setCreateOpen(true);
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreateFormError(null);

    const name = createName.trim();
    if (!name) {
      setCreateNameError("Workspace name is required.");
      return;
    }
    setCreateNameError(null);
    setCreating(true);

    try {
      const res = await fetch(CREATE_WORKSPACE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        workspace_id?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok || typeof data.workspace_id !== "string" || !data.workspace_id.trim()) {
        setCreateFormError(
          data.message?.trim() ||
            data.error?.trim() ||
            (res.status === 401 ? "Not signed in." : "Could not create workspace."),
        );
        return;
      }

      const workspaceId = data.workspace_id.trim();
      setCreateOpen(false);
      await navigateAfterAppShellRouteTransition(router, workspaceCreateSuccessPath(workspaceId));
      router.refresh();
    } catch {
      clearAppShellRouteTransitionState();
      setCreateFormError("Could not create workspace. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ds-text-primary)]">
          Select a workspace
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Choose which workspace to open in RiskAI, or create a new one. You can change this anytime
          from the left rail.
        </p>
      </div>

      {workspaces.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-left" aria-label="Workspaces">
          {workspaces.map((workspace) => {
            const isSelected = workspace.id === selectedWorkspaceId;
            return (
              <li key={workspace.id}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto w-full justify-between gap-3 px-4 py-3 text-left"
                  disabled={busy}
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
      ) : null}

      <Button
        type="button"
        variant="primary"
        className="w-full"
        disabled={busy}
        onClick={openCreateWorkspace}
      >
        Create Workspace
      </Button>

      {error ? (
        <p className="m-0 text-sm text-[var(--ds-status-danger-fg)]" role="alert">
          {error}
        </p>
      ) : null}

      {createOpen ? (
        <div
          className="ds-modal-backdrop z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-workspace-title"
        >
          <div className="w-full max-w-sm rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-4 shadow-lg">
            <h2
              id="create-workspace-title"
              className="mb-3 text-base font-semibold text-[var(--ds-text-primary)]"
            >
              Create Workspace
            </h2>
            <form onSubmit={(event) => void handleCreateWorkspace(event)} className="space-y-3" noValidate>
              <div>
                <Label htmlFor="riskai-create-workspace-name">Workspace name</Label>
                <Input
                  id="riskai-create-workspace-name"
                  name="name"
                  value={createName}
                  onChange={(event) => {
                    setCreateName(event.target.value);
                    if (createNameError) setCreateNameError(null);
                  }}
                  placeholder="Workspace name"
                  autoComplete="organization"
                  disabled={creating}
                  aria-invalid={Boolean(createNameError)}
                  aria-describedby={
                    createNameError ? "riskai-create-workspace-name-err" : undefined
                  }
                  autoFocus
                />
                {createNameError ? (
                  <FieldError id="riskai-create-workspace-name-err">{createNameError}</FieldError>
                ) : null}
              </div>
              {createFormError ? (
                <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
                  {createFormError}
                </Callout>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={creating}
                  onClick={() => {
                    setCreateOpen(false);
                    setCreateNameError(null);
                    setCreateFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating}>
                  {creating ? "Creating…" : "Create Workspace"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
