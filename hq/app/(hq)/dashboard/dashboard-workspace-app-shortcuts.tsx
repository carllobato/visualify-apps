import { fetchDashboardWorkspaceAppsEnrichment } from "@/lib/dashboard-launcher-data";
import { WorkspaceAppShortcutsNav } from "./dashboard-workspace-app-shortcuts-nav";

/** Deferred server load: billable product shortcuts + RiskAI counts for one workspace tile. */
export async function WorkspaceLauncherAppShortcuts({
  userId,
  workspaceId,
  workspaceName,
}: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
}) {
  const appsByWorkspace = await fetchDashboardWorkspaceAppsEnrichment(userId);
  const apps = appsByWorkspace.get(workspaceId) ?? [];

  return <WorkspaceAppShortcutsNav apps={apps} workspaceName={workspaceName} />;
}
