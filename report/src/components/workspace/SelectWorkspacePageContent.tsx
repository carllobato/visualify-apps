"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Callout } from "@visualify/design-system";
import { setReportActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { REPORT_ROUTES } from "@/lib/report-routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

function safeReturnPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return REPORT_ROUTES.projects;
  }
  return next;
}

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
  const returnPath = safeReturnPath(searchParams.get("next"));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseWorkspace(workspaceId: string) {
    if (busyId) return;
    setError(null);
    setBusyId(workspaceId);
    const result = await setReportActiveWorkspaceIdAction(workspaceId);
    setBusyId(null);
    if (!result.ok) {
      setError("Could not select that workspace. Try again or pick another.");
      return;
    }
    router.replace(returnPath);
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          {variant === "home" ? "Select your workspace" : "Select a workspace"}
        </h1>
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          {variant === "home"
            ? "Choose a workspace to continue in Report."
            : "Choose which workspace to use in Report. You can change this anytime from the left rail."}
        </p>
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
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{workspace.name}</span>
                    {workspace.slug ? (
                      <span className="text-[length:var(--ds-text-xs)] font-normal text-[var(--ds-text-muted)]">
                        {workspace.slug}
                      </span>
                    ) : null}
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
