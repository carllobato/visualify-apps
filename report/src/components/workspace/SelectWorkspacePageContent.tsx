"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Callout } from "@visualify/design-system";
import { setReportActiveWorkspaceIdAction } from "@/lib/workspace/setActiveWorkspaceAction";
import { REPORT_DEFAULT_ROUTE } from "@/lib/report-routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

function safeReturnPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return REPORT_DEFAULT_ROUTE;
  }
  return next;
}

export function SelectWorkspacePageContent({ workspaces }: { workspaces: EntitledWorkspace[] }) {
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
          Select a workspace
        </h1>
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          Choose which workspace to use in Report. You can change this anytime from the left rail.
        </p>
      </div>

      {error ? (
        <Callout status="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {workspaces.map((workspace) => {
          const busy = busyId === workspace.id;
          return (
            <li key={workspace.id}>
              <Button
                type="button"
                variant="secondary"
                className="h-auto w-full justify-start px-4 py-3 text-left"
                disabled={busyId !== null}
                onClick={() => void chooseWorkspace(workspace.id)}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-[var(--ds-text-primary)]">{workspace.name}</span>
                  {workspace.slug ? (
                    <span className="text-[length:var(--ds-text-xs)] font-normal text-[var(--ds-text-muted)]">
                      {workspace.slug}
                    </span>
                  ) : null}
                </span>
                {busy ? (
                  <span className="ml-auto text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    Selecting…
                  </span>
                ) : null}
              </Button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
