import Link from "next/link";
import { Suspense } from "react";
import type { WorkspaceDashboardEntry } from "@/lib/workspace-settings-data";
import { DashboardOpenWorkspaceProvider } from "./dashboard-workspaces-open.client";
import { DashboardWorkspaceTile } from "./dashboard-workspace-tile.client";
import { WorkspaceLauncherAppShortcuts } from "./dashboard-workspace-app-shortcuts";

export function DashboardWorkspacesSection({
  userId,
  workspaces,
}: {
  userId: string;
  workspaces: WorkspaceDashboardEntry[];
}) {
  if (workspaces.length === 0) {
    return (
      <section aria-label="Workspaces" className="min-w-0">
        <div className="ds-document-tile-panel ds-hq-workspace-launcher-empty">
          <p className="m-0 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
            You aren&apos;t a member of any workspaces yet. Create one to enable apps and billing, or join an
            existing workspace when an admin invites you.
          </p>
          <Link
            href="/account"
            className="mt-2 inline-flex text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] underline underline-offset-2 hover:text-[var(--ds-text-secondary)]"
          >
            Account settings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Workspaces" className="min-w-0">
      <DashboardOpenWorkspaceProvider>
        <ul className="ds-hq-workspace-launcher-grid">
          {workspaces.map((w) => (
            <li key={w.id} className="min-w-0">
              <DashboardWorkspaceTile
                workspace={w}
                appShortcuts={
                  <Suspense fallback={null}>
                    <WorkspaceLauncherAppShortcuts
                      userId={userId}
                      workspaceId={w.id}
                      workspaceName={w.name}
                    />
                  </Suspense>
                }
              />
            </li>
          ))}
        </ul>
      </DashboardOpenWorkspaceProvider>
    </section>
  );
}
