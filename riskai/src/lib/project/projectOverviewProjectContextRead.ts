import {
  parseProjectContextFromCanonicalVisualifyProjectsRow,
  type ProjectContext,
} from "@/lib/projectContext";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import {
  applyStaleReportingLockRag,
  computeRag,
  type ProjectTilePayload,
} from "@/lib/dashboard/projectTileServerData";
import {
  formatReportingLineStatus,
  tryReportingBreakdownFromLockedRowAndSettings,
  tryReportingPositionDriverScalars,
} from "@/lib/dashboard/reportingPositionRag";

/** Canonical `visualify_projects` columns required by the ProjectContext parser. */
export const PROJECT_OVERVIEW_CANONICAL_PROJECT_CONTEXT_SELECT =
  "project_name, project_location, project_currency, project_value, project_contingency, project_delay_cost_per_working_day, project_planned_duration_months, project_target_completion_date, project_working_days_per_week, project_schedule_contingency_working_days, project_risk_appetite";

function asRow(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Project Overview PAGE Project Context for gated project-scoped use: canonical
 * `visualify_projects.project_*` only.
 *
 * `settingsRow` and `localStorageContext` are ignored. Incomplete canonical
 * Projects are handled by the S4.5D route gate, not settings/localStorage.
 */
export function resolveProjectOverviewProjectContext(args: {
  settingsRow?: Record<string, unknown> | null;
  canonicalProjectRow?: Record<string, unknown> | null;
  localStorageContext?: ProjectContext | null;
}): ProjectContext | null {
  return parseProjectContextFromCanonicalVisualifyProjectsRow(asRow(args.canonicalProjectRow));
}

/**
 * Project Overview RAG / reporting-position current Project parameters: canonical
 * `visualify_projects.project_*` only. Does not use settings or localStorage.
 *
 * Missing canonical stays unset so incomplete Projects keep existing unavailable
 * RAG behaviour (S4.5D redirects before this page in normal use).
 *
 * Locked/historical snapshot rows are unchanged; this helper only hydrates
 * current Project configuration used alongside them.
 */
export function resolveProjectOverviewReportingPositionContext(args: {
  settingsRow?: Record<string, unknown> | null;
  canonicalProjectRow?: Record<string, unknown> | null;
}): ProjectContext | null {
  return parseProjectContextFromCanonicalVisualifyProjectsRow(asRow(args.canonicalProjectRow));
}

/**
 * Project Overview KPI-modal payload: same fields and stale-lock rules as
 * {@link buildProjectTilePayloadForReportingModal}, with canonical-only current
 * Project parameters. Workspace Overview tiles use {@link getProjectTilePayloads}
 * with canonical-first then settings fallback.
 */
export function buildProjectOverviewTilePayloadForReportingModal(params: {
  project: { id: string; name: string; created_at?: string | null };
  lockedRow: SimulationSnapshotRow;
  canonicalProjectRow?: Record<string, unknown> | null;
  /** Ignored. Gated Project Overview RAG uses canonical current Project parameters only. */
  settingsRow?: Record<string, unknown> | null | undefined;
  riskCount: number;
  highSeverityCount: number;
  nowMs?: number;
}): ProjectTilePayload {
  const { project, lockedRow, canonicalProjectRow, riskCount, highSeverityCount } = params;
  const nowMs = params.nowMs ?? Date.now();

  const lastLockedAt = lockedRow != null ? (lockedRow.locked_at ?? lockedRow.created_at ?? null) : null;

  const reporting = tryReportingBreakdownFromLockedRowAndSettings(
    lockedRow,
    canonicalProjectRow,
  );
  const reportingDrivers = tryReportingPositionDriverScalars(
    lockedRow,
    canonicalProjectRow,
  );
  const baseRag = reporting?.rag ??
    computeRag({
      riskCount,
      highSeverityCount,
      lastLockedReportingAt: lastLockedAt,
    });
  const ragStatus = applyStaleReportingLockRag(baseRag, lockedRow, nowMs);

  const base: ProjectTilePayload = {
    id: project.id,
    name: project.name,
    created_at: project.created_at ?? null,
    ragStatus,
    ...(lastLockedAt != null && lastLockedAt !== "" ? { reportingLockedAt: lastLockedAt } : {}),
  };

  if (reporting) {
    return {
      ...base,
      reportingCostStatus: formatReportingLineStatus(reporting.costLine),
      reportingTimeStatus: formatReportingLineStatus(reporting.timeLine),
      reportingOverallStatus: reporting.overallStatus,
      ...(reportingDrivers != null
        ? {
            reportingDriverTargetP: reportingDrivers.targetPNumeric,
            reportingDriverCurrency: reportingDrivers.currency,
            ...(reportingDrivers.costAtTargetPDollars != null &&
            Number.isFinite(reportingDrivers.costAtTargetPDollars)
              ? { reportingCostAtTargetPDollars: reportingDrivers.costAtTargetPDollars }
              : {}),
            ...(reportingDrivers.timeAtTargetPDays != null &&
            Number.isFinite(reportingDrivers.timeAtTargetPDays)
              ? { reportingTimeAtTargetPDays: reportingDrivers.timeAtTargetPDays }
              : {}),
            ...(reportingDrivers.costShortfallDollars != null
              ? { reportingCostShortfallAbs: reportingDrivers.costShortfallDollars }
              : {}),
            ...(reportingDrivers.costSurplusDollars != null && reportingDrivers.costSurplusDollars > 0
              ? { reportingCostSurplusAbs: reportingDrivers.costSurplusDollars }
              : {}),
            ...(reportingDrivers.timeShortfallDays != null
              ? { reportingTimeShortfallDays: reportingDrivers.timeShortfallDays }
              : {}),
            ...(reportingDrivers.timeSurplusDays != null && reportingDrivers.timeSurplusDays > 0
              ? { reportingTimeSurplusDays: reportingDrivers.timeSurplusDays }
              : {}),
          }
        : {}),
    };
  }
  return base;
}
