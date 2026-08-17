import type { WorkspaceRole } from "@visualify/workspace-product-access";
import {
  REPORTING_UNIT_OPTIONS,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import { resolveWorkspacePortfolioCapabilities } from "@/lib/workspace/workspaceRoleCapabilities";

const REPORTING_UNITS = new Set<string>(REPORTING_UNIT_OPTIONS);

/** Owner and admin may edit Workspace Settings; member and viewer may not. */
export function canEditWorkspaceSettings(role: WorkspaceRole | null): boolean {
  if (!role) return false;
  return resolveWorkspacePortfolioCapabilities(role).canEditPortfolioDetails;
}

export function workspaceSettingsPatchPath(workspaceId: string): string {
  return `/api/workspaces/${workspaceId}`;
}

export type WorkspaceSettingsPatchUpdates = {
  name?: string;
  reporting_unit?: ReportingUnitOption;
};

/**
 * Builds a sparse PATCH so a name-only save does not persist `reporting_unit`.
 * That avoids writing MILLIONS onto an unset Workspace column and replacing
 * the Portfolio fallback dashboards still use.
 */
export function workspaceSettingsPatchBody(params: {
  name: string;
  initialName: string;
  reportingUnit: ReportingUnitOption;
  initialReportingUnit: ReportingUnitOption;
}): WorkspaceSettingsPatchUpdates {
  const updates: WorkspaceSettingsPatchUpdates = {};
  const trimmedName = params.name.trim();
  if (trimmedName !== params.initialName.trim()) {
    updates.name = trimmedName;
  }
  if (params.reportingUnit !== params.initialReportingUnit) {
    updates.reporting_unit = params.reportingUnit;
  }
  return updates;
}

export type ParseWorkspaceSettingsPatchResult =
  | { ok: true; updates: WorkspaceSettingsPatchUpdates }
  | { ok: false; error: string };

/**
 * Accepts only `name` and `reporting_unit`. Other keys are ignored (not written).
 */
export function parseWorkspaceSettingsPatchBody(
  body: Record<string, unknown>,
): ParseWorkspaceSettingsPatchResult {
  const updates: WorkspaceSettingsPatchUpdates = {};

  if ("name" in body) {
    if (typeof body.name !== "string") {
      return { ok: false, error: "Invalid name" };
    }
    const name = body.name.trim();
    if (!name) {
      return { ok: false, error: "Workspace name is required" };
    }
    updates.name = name;
  }

  if ("reporting_unit" in body) {
    const value = body.reporting_unit;
    if (typeof value !== "string") {
      return { ok: false, error: "Invalid reporting_unit" };
    }
    const reportingUnit = value.trim();
    if (!REPORTING_UNITS.has(reportingUnit)) {
      return { ok: false, error: "Invalid reporting_unit" };
    }
    updates.reporting_unit = reportingUnit as ReportingUnitOption;
  }

  if (updates.name === undefined && updates.reporting_unit === undefined) {
    return { ok: false, error: "Provide at least one of name or reporting_unit" };
  }

  return { ok: true, updates };
}
