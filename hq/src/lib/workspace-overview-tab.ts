export type WorkspaceOverviewTab = "details" | "apps" | "workspace_users" | "billing" | "settings";

const WORKSPACE_OVERVIEW_TABS = new Set<WorkspaceOverviewTab>([
  "details",
  "apps",
  "workspace_users",
  "billing",
  "settings",
]);

export function parseWorkspaceOverviewTab(value: string | undefined | null): WorkspaceOverviewTab | null {
  if (!value) return null;
  return WORKSPACE_OVERVIEW_TABS.has(value as WorkspaceOverviewTab) ? (value as WorkspaceOverviewTab) : null;
}
