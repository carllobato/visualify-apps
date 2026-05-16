import { railBrandTitleClass, shellPageHeaderRailRowClassName } from "@visualify/app-shell";
import { redirect } from "next/navigation";
import { DashboardWorkspacesSection } from "./dashboard-workspaces-section";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchManageableWorkspacesForDashboard,
  resolveSelectedWorkspaceIdForRail,
} from "@/lib/workspace-settings-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await fetchManageableWorkspacesForDashboard(user.id);
  const selectedWorkspaceId = await resolveSelectedWorkspaceIdForRail(user.id);

  return (
    <div className="flex min-h-full flex-col items-start justify-start px-0 pb-10 pt-0">
      <main className="w-full max-w-none shrink-0 space-y-10">
        <div className="space-y-2.5">
          <div className={shellPageHeaderRailRowClassName}>
            <h1 className={`m-0 text-[var(--ds-text-primary)] ${railBrandTitleClass}`}>Visualify HQ</h1>
          </div>
          <p className="max-w-xl text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            Select a workspace to manage its apps and billing, or use Organisation and Account for setup and
            identity settings.
          </p>
        </div>

        <DashboardWorkspacesSection workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />
      </main>
    </div>
  );
}
