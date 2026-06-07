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

/** Billing is owner-only; Settings is owner-only; others fall back to details when disallowed. */
export function resolveWorkspaceOverviewInitialTab(
  tabParam: string | undefined | null,
  options: { canViewBilling: boolean; canViewSettings: boolean },
): WorkspaceOverviewTab {
  const parsed = parseWorkspaceOverviewTab(tabParam);
  if (parsed === "billing" && !options.canViewBilling) return "details";
  if (parsed === "settings" && !options.canViewSettings) return "details";
  return parsed ?? "details";
}
