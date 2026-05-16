/**
 * Allowed `visualify_workspaces.workspace_type` values for manual HQ onboarding.
 *
 * Types are intentionally minimal during MVP stabilisation — the live DB check constraint
 * currently allows only `personal` and `organisation`. `organisation` is the generic
 * collaborative/commercial workspace type (teams, companies, client work, shared access).
 */
export const WORKSPACE_CREATE_TYPES = ["organisation", "personal"] as const;

export type WorkspaceCreateType = (typeof WORKSPACE_CREATE_TYPES)[number];

export function isWorkspaceCreateType(value: string): value is WorkspaceCreateType {
  return (WORKSPACE_CREATE_TYPES as readonly string[]).includes(value);
}

export type WorkspaceCreateTypeOption = {
  value: WorkspaceCreateType;
  label: string;
  description: string;
};

export const WORKSPACE_CREATE_TYPE_OPTIONS: readonly WorkspaceCreateTypeOption[] = [
  {
    value: "organisation",
    label: "Organisation",
    description: "Teams, companies, clients, shared workspaces",
  },
  {
    value: "personal",
    label: "Personal",
    description: "Individual use",
  },
] as const;

export const WORKSPACE_CREATE_TYPE_LABELS: Record<WorkspaceCreateType, string> = {
  organisation: WORKSPACE_CREATE_TYPE_OPTIONS[0].label,
  personal: WORKSPACE_CREATE_TYPE_OPTIONS[1].label,
};

export const WORKSPACE_CREATE_TYPE_DESCRIPTIONS: Record<WorkspaceCreateType, string> = {
  organisation: WORKSPACE_CREATE_TYPE_OPTIONS[0].description,
  personal: WORKSPACE_CREATE_TYPE_OPTIONS[1].description,
};
