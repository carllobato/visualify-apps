"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Callout } from "@visualify/design-system";
import { clearAppShellRouteTransitionState, navigateAfterAppShellRouteTransition } from "@visualify/app-shell";
import "@/components/layout/report-mobile-pages.css";
import { setReportActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { reportReturnPathAfterWorkspaceSelection } from "@/lib/report-routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

type SelectWorkspacePageContentProps = {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId?: string | null;
  variant?: "home" | "picker";
};

export function SelectWorkspacePageContent({
  workspaces,
  selectedWorkspaceId = null,
  variant = "picker",
}: SelectWorkspacePageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = reportReturnPathAfterWorkspaceSelection(searchParams.get("next"));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseWorkspace(workspaceId: string) {
    if (busyId) return;
    setError(null);
    setBusyId(workspaceId);
    try {
      const result = await setReportActiveWorkspaceIdAction(workspaceId);
      if (!result.ok) {
        setBusyId(null);
        setError("Could not select that workspace. Try again or pick another.");
        return;
      }
      await navigateAfterAppShellRouteTransition(router, returnPath, { replace: true });
    } catch {
      setBusyId(null);
      clearAppShellRouteTransitionState();
      setError("Could not select that workspace. Try again or pick another.");
    }
  }

  return (
    <main className="report-mobile-page mx-auto flex w-full max-w-lg flex-col gap-4 py-8 max-md:mx-0 max-md:max-w-none max-md:py-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          {variant === "home" ? "Select workspace" : "Select a workspace"}
        </h1>
        {variant === "home" ? (
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            Choose where to open Report.
          </p>
        ) : (
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            Choose which workspace to use in Report. You can change this anytime from the left rail.
          </p>
        )}
      </div>

      {error ? (
        <Callout status="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      {workspaces.length === 0 ? (
        <Callout status="info">
          You do not have access to any Report workspaces yet. Ask a workspace admin to invite you.
        </Callout>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {workspaces.map((workspace) => {
            const busy = busyId === workspace.id;
            const isSelected = selectedWorkspaceId === workspace.id;
            return (
              <li key={workspace.id}>
                <Button
                  type="button"
                  variant="secondary"
                  className={[
                    "h-auto w-full justify-between gap-3 px-4 py-3 text-left",
                    isSelected ? "outline outline-2 outline-offset-0 outline-[var(--ds-primary)]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={busyId !== null}
                  onClick={() => void chooseWorkspace(workspace.id)}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{workspace.name}</span>
                  </span>
                  {busy ? (
                    <span className="shrink-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      Selecting…
                    </span>
                  ) : isSelected ? (
                    <Badge status="info" variant="subtle" className="shrink-0">
                      Last used
                    </Badge>
                  ) : null}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
