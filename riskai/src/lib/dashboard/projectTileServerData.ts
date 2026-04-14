import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRating,
  costToConsequenceScale,
  riskTriggerProbability01,
  timeDaysToConsequenceScale,
} from "@/domain/risk/risk.logic";
import type { Risk } from "@/domain/risk/risk.schema";
import {
  appliesToExcludesCost,
  appliesToExcludesTime,
  getCurrentRiskRatingLetter,
  getCurrentRiskRatingLevel,
  isRiskActiveForPortfolioAnalytics,
  isRiskStatusArchived,
  riskLifecycleBucketForRegisterSnapshot,
  scheduleImpactDaysMLCappedForMonteCarlo,
} from "@/domain/risk/riskFieldSemantics";
import type { AccessibleProject } from "@/lib/portfolios-server";
import { RISK_DB_SELECT_COLUMNS, mapRiskRowToDomain } from "@/lib/db/risks";
import { computePortfolioExposure } from "@/engine/forwardExposure";
import { formatDurationDays, formatDurationWholeDays } from "@/lib/formatDuration";
import type { RiskRow } from "@/types/risk";
import {
  DEFAULT_REPORTING_UNIT,
  formatCurrencyInReportingUnit,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import {
  asProjectCurrency,
  contingencyMillionsFromSettingsRow,
  type ProjectSettingsContingencyRow,
} from "@/lib/portfolioContingencyAggregate";
import type { ProjectCurrency } from "@/lib/projectContext";
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import {
  computePortfolioReportingFooter,
  formatReportingLineStatus,
  tryReportingBreakdownFromLockedRowAndSettings,
  tryReportingFundingScalars,
  tryReportingPositionDriverScalars,
} from "@/lib/dashboard/reportingPositionRag";
import {
  monitoringCostOpportunityExpected,
  monitoringScheduleOpportunityExpected,
  preMitigationCostExpectedForOpportunity,
} from "@/lib/opportunityMetrics";
import type { PortfolioReportingFooterRow } from "@/lib/dashboard/reportingPositionRag";
import {
  computeNeedsAttentionHealthRun,
  simulationTimestampInCurrentUtcMonth,
  type PortfolioNeedsAttentionHealthRun,
} from "@/lib/dashboard/needsAttentionHealthRun";

export type { PortfolioReportingFooterRow };
export type { PortfolioNeedsAttentionHealthRun } from "@/lib/dashboard/needsAttentionHealthRun";

export type RagStatus = "green" | "amber" | "red";

export type ProjectTilePayload = {
  id: string;
  name: string;
  created_at: string | null;
  ragStatus: RagStatus;
  /** From last reporting-locked simulation + settings (same as simulation “position” cards). */
  reportingCostStatus?: string;
  reportingTimeStatus?: string;
  reportingOverallStatus?: string;
  /** Simulated cost at target P minus held funds (contingency, else approved budget); KPI modal driver line. */
  reportingCostShortfallAbs?: number;
  /** Simulated delay at target P minus schedule contingency (days); KPI modal driver line. */
  reportingTimeShortfallDays?: number;
  /** Held funds minus simulated cost at target P when > 0 — headroom line in KPI modal. */
  reportingCostSurplusAbs?: number;
  /** Schedule contingency minus simulated delay at target P when > 0 — headroom line in KPI modal. */
  reportingTimeSurplusDays?: number;
  reportingDriverTargetP?: number;
  reportingDriverCurrency?: ProjectCurrency;
  /** Simulated total cost at appetite P (reporting run); KPI sublines show this instead of bare “P90”. */
  reportingCostAtTargetPDollars?: number;
  /** Simulated delay at appetite P (days). */
  reportingTimeAtTargetPDays?: number;
  /** ISO timestamp of latest reporting-locked snapshot (`locked_at` or `created_at`) for KPI context. */
  reportingLockedAt?: string | null;
};

type RiskAggRow = {
  project_id: string;
  status: string | null;
  post_probability: number;
  post_cost_ml: number;
  post_time_ml: number;
  mitigation_description: string | null;
};

/** Reporting discipline: locked monthly snapshot older than this is flagged (amber) unless already red. */
export const REPORTING_LOCK_STALE_MS = 30 * 24 * 60 * 60 * 1000;

function reportingLockCompletedAtMs(row: SimulationSnapshotRow | undefined): number | null {
  if (!row) return null;
  const s = row.locked_at ?? row.created_at;
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

function isReportingLockStale(lastMs: number | null, nowMs: number): boolean {
  if (lastMs == null) return false;
  return nowMs - lastMs > REPORTING_LOCK_STALE_MS;
}

/** Bump green → amber when the latest locked reporting snapshot is stale. */
export function applyStaleReportingLockRag(
  base: RagStatus,
  lockedRow: SimulationSnapshotRow | undefined,
  nowMs: number
): RagStatus {
  if (base === "red") return base;
  const lastMs = reportingLockCompletedAtMs(lockedRow);
  if (!isReportingLockStale(lastMs, nowMs)) return base;
  return "amber";
}

function residualLevel(row: RiskAggRow): "low" | "medium" | "high" | "extreme" {
  const postConsequence = Math.max(
    costToConsequenceScale(Number(row.post_cost_ml) || 0),
    timeDaysToConsequenceScale(Number(row.post_time_ml) || 0)
  );
  return buildRating(Number(row.post_probability) || 1, postConsequence).level;
}

/**
 * Base project tile RAG before the monthly reporting staleness rule: high/extreme residual → red;
 * active risks but no locked reporting run → amber; else green.
 * The caller applies {@link applyStaleReportingLockRag} so a locked run older than {@link REPORTING_LOCK_STALE_MS} becomes amber.
 * Uses **locked-for-reporting** snapshots only — ad-hoc simulations do not count as a monthly run.
 */
export function computeRag(params: {
  riskCount: number;
  highSeverityCount: number;
  /** Latest locked-for-reporting completion (`locked_at` or `created_at`); null if none. */
  lastLockedReportingAt: string | null;
}): RagStatus {
  if (params.highSeverityCount > 0) return "red";
  const hasLockedRun = params.lastLockedReportingAt != null;
  if (params.riskCount > 0 && !hasLockedRun) return "amber";
  return "green";
}

export type GetProjectTilePayloadsResult = {
  projectTilePayloads: ProjectTilePayload[];
  /** Portfolio aggregate row for KPI modal; null if mixed currency or no usable reporting sums. */
  portfolioReportingFooter: PortfolioReportingFooterRow | null;
};

export type LoadPortfolioProjectTilePayloadsResult = GetProjectTilePayloadsResult & {
  /** All projects in the portfolio (including those without a locked reporting snapshot). */
  totalProjectsInPortfolio: number;
};

export type GetProjectTilePayloadsOptions = {
  /**
   * When true, only include projects that have at least one locked-for-reporting snapshot.
   * Used for portfolio dashboards (projects without a saved monthly run are omitted).
   */
  onlyProjectsWithLockedReporting?: boolean;
  /** Override clock for stale-lock checks (tests). */
  nowMs?: number;
  /**
   * When set (validated `YYYY-MM`), only locked reporting snapshots for that calendar month
   * (`report_month` = `YYYY-MM-01`) participate in per-project “latest lock” selection.
   */
  reportingMonthYear?: string;
};

/**
 * Loads per-project RAG for dashboard tiles (server-only; same access scope as project list).
 */
export async function getProjectTilePayloads(
  supabase: SupabaseClient,
  projects: AccessibleProject[],
  options?: GetProjectTilePayloadsOptions
): Promise<GetProjectTilePayloadsResult> {
  if (projects.length === 0) {
    return { projectTilePayloads: [], portfolioReportingFooter: null };
  }

  const ids = projects.map((p) => p.id);
  const nowMs = options?.nowMs ?? Date.now();

  let lockedSnapshotsQuery = supabase
    .from("riskai_simulation_snapshots")
    .select("*")
    .in("project_id", ids)
    .eq("locked_for_reporting", true);
  const reportingMonthYear = options?.reportingMonthYear?.trim();
  if (reportingMonthYear) {
    lockedSnapshotsQuery = lockedSnapshotsQuery.eq("report_month", `${reportingMonthYear}-01`);
  }

  const [risksRes, lockedRes, settingsRes] = await Promise.all([
    supabase
      .from("riskai_risks")
      .select("project_id, status, post_probability, post_cost_ml, post_time_ml, mitigation_description")
      .in("project_id", ids),
    lockedSnapshotsQuery,
    supabase.from("visualify_project_settings").select("*").in("project_id", ids),
  ]);

  if (risksRes.error) {
    return {
      projectTilePayloads: projects.map((p) => ({
        id: p.id,
        name: p.name,
        created_at: p.created_at,
        ragStatus: "amber" as const,
      })),
      portfolioReportingFooter: null,
    };
  }

  const risks = (risksRes.data ?? []) as RiskAggRow[];

  const riskStats = new Map<string, { count: number; highSeverity: number }>();
  for (const id of ids) {
    riskStats.set(id, { count: 0, highSeverity: 0 });
  }
  for (const r of risks) {
    if (isRiskStatusArchived(r.status)) continue;
    const stat = riskStats.get(r.project_id);
    if (!stat) continue;
    stat.count += 1;
    const level = residualLevel(r);
    if (level === "high" || level === "extreme") stat.highSeverity += 1;
  }

  const latestLockedByProject = new Map<string, NonNullable<SimulationSnapshotRow>>();
  if (!lockedRes.error) {
    const lockedRows = ((lockedRes.data ?? []) as SimulationSnapshotRow[]).filter(
      (r): r is NonNullable<SimulationSnapshotRow> => r != null
    );
    const sortedLocked = [...lockedRows].sort((a, b) => {
      const ta = new Date(a.locked_at ?? a.created_at ?? 0).getTime();
      const tb = new Date(b.locked_at ?? b.created_at ?? 0).getTime();
      return tb - ta;
    });
    for (const row of sortedLocked) {
      const pid = typeof row.project_id === "string" ? row.project_id : "";
      if (!pid || latestLockedByProject.has(pid)) continue;
      latestLockedByProject.set(pid, row);
    }
  }

  const settingsByProject = new Map<string, Record<string, unknown>>();
  if (!settingsRes.error) {
    for (const row of settingsRes.data ?? []) {
      const pid = typeof (row as { project_id?: string }).project_id === "string" ? (row as { project_id: string }).project_id : "";
      if (pid) settingsByProject.set(pid, row as Record<string, unknown>);
    }
  }

  const projectTilePayloads = projects
    .map((p) => {
      const stat = riskStats.get(p.id) ?? { count: 0, highSeverity: 0 };
      const lockedRow = latestLockedByProject.get(p.id);
      const lastLockedAt =
        lockedRow != null ? (lockedRow.locked_at ?? lockedRow.created_at ?? null) : null;

      /** Prefer simulation “overall position” bands from the latest reporting-locked snapshot; else legacy tile RAG. */
      const reporting = tryReportingBreakdownFromLockedRowAndSettings(
        lockedRow,
        settingsByProject.get(p.id)
      );
      const reportingDrivers = tryReportingPositionDriverScalars(lockedRow, settingsByProject.get(p.id));
      const baseRag: RagStatus =
        reporting?.rag ??
        computeRag({
          riskCount: stat.count,
          highSeverityCount: stat.highSeverity,
          lastLockedReportingAt: lastLockedAt,
        });
      const ragStatus = applyStaleReportingLockRag(baseRag, lockedRow, nowMs);

      const base = {
        id: p.id,
        name: p.name,
        created_at: p.created_at,
        ragStatus,
        ...(lastLockedAt != null && lastLockedAt !== ""
          ? { reportingLockedAt: lastLockedAt }
          : {}),
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
    })
    .filter((payload) =>
      options?.onlyProjectsWithLockedReporting ? latestLockedByProject.has(payload.id) : true
    );

  const fundingRows = ids
    .map((id) => tryReportingFundingScalars(latestLockedByProject.get(id), settingsByProject.get(id)))
    .filter((x): x is NonNullable<typeof x> => x != null);
  const portfolioReportingFooter = computePortfolioReportingFooter(fundingRows);

  return { projectTilePayloads, portfolioReportingFooter };
}

/** Red → Amber → Green for dashboard ordering. */
export const RAG_SORT_ORDER: Record<RagStatus, number> = {
  red: 0,
  amber: 1,
  green: 2,
};

/**
 * Portfolio-level RAG: worst project wins (red over amber over green).
 * Uses the same per-project tile RAG as the dashboard (locked reporting + 30-day staleness rule).
 * Returns `null` when there are no projects.
 */
export function aggregatePortfolioRag(tiles: ProjectTilePayload[]): RagStatus | null {
  if (tiles.length === 0) return null;
  return tiles.reduce<RagStatus>(
    (worst, t) => (RAG_SORT_ORDER[t.ragStatus] < RAG_SORT_ORDER[worst] ? t.ragStatus : worst),
    "green"
  );
}

export function sortProjectTilesByRag(tiles: ProjectTilePayload[]): ProjectTilePayload[] {
  return [...tiles].sort((a, b) => {
    const byRag = RAG_SORT_ORDER[a.ragStatus] - RAG_SORT_ORDER[b.ragStatus];
    if (byRag !== 0) return byRag;
    const an = (a.name || a.id).toLocaleLowerCase();
    const bn = (b.name || b.id).toLocaleLowerCase();
    return an.localeCompare(bn);
  });
}

export function sortProjectTilesAlphabetically(tiles: ProjectTilePayload[]): ProjectTilePayload[] {
  return [...tiles].sort((a, b) => {
    const an = (a.name || a.id).toLocaleLowerCase();
    const bn = (b.name || b.id).toLocaleLowerCase();
    return an.localeCompare(bn);
  });
}

/**
 * Projects in a portfolio with RAG payloads — same data and ordering as the portfolio projects page (`/portfolios/:id/projects`).
 */
/** Per-project register-aligned severity counts (active risks only — Open / Monitoring / Mitigating). */
export type PortfolioProjectRiskSeverityRow = {
  projectId: string;
  projectName: string;
  low: number;
  medium: number;
  high: number;
  extreme: number;
};

/** Per-project lifecycle counts for the Active Risks KPI modal (all non–archived risks counted by bucket). */
export type PortfolioProjectRiskStatusRow = {
  projectId: string;
  projectName: string;
  open: number;
  monitoring: number;
  mitigating: number;
  /** Closed and archived register statuses combined. */
  closedArchived: number;
  /** Draft and unmapped lifecycle buckets. */
  other: number;
};

function buildPortfolioProjectRiskSeverityRowsFromRiskRows(
  projects: { id: unknown; name: unknown }[],
  riskRows: RiskRow[]
): PortfolioProjectRiskSeverityRow[] {
  const ids = projects.map((p) => p.id as string);
  const buckets = new Map<string, { low: number; medium: number; high: number; extreme: number }>();
  for (const id of ids) {
    buckets.set(id, { low: 0, medium: 0, high: 0, extreme: 0 });
  }
  for (const row of riskRows) {
    const risk = mapRiskRowToDomain(row);
    if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
    const b = buckets.get(row.project_id);
    if (!b) continue;
    const lv = getCurrentRiskRatingLevel(risk);
    if (lv == null) continue;
    if (lv === "low") b.low += 1;
    else if (lv === "medium") b.medium += 1;
    else if (lv === "high") b.high += 1;
    else b.extreme += 1;
  }
  return projects.map((p) => {
    const id = p.id as string;
    const b = buckets.get(id) ?? { low: 0, medium: 0, high: 0, extreme: 0 };
    const name = typeof p.name === "string" ? p.name.trim() : "";
    return {
      projectId: id,
      projectName: name || id,
      ...b,
    };
  });
}

function buildPortfolioProjectRiskStatusRowsFromRiskRows(
  projects: { id: unknown; name: unknown }[],
  riskRows: RiskRow[]
): PortfolioProjectRiskStatusRow[] {
  const ids = projects.map((p) => p.id as string);
  const buckets = new Map<
    string,
    { open: number; monitoring: number; mitigating: number; closedArchived: number; other: number }
  >();
  for (const id of ids) {
    buckets.set(id, { open: 0, monitoring: 0, mitigating: 0, closedArchived: 0, other: 0 });
  }
  for (const row of riskRows) {
    const risk = mapRiskRowToDomain(row);
    const b = buckets.get(row.project_id);
    if (!b) continue;
    const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
    if (bucket === "open") b.open += 1;
    else if (bucket === "monitoring") b.monitoring += 1;
    else if (bucket === "mitigating") b.mitigating += 1;
    else if (bucket === "closed" || bucket === "archived") b.closedArchived += 1;
    else b.other += 1;
  }
  return projects.map((p) => {
    const id = p.id as string;
    const b = buckets.get(id) ?? { open: 0, monitoring: 0, mitigating: 0, closedArchived: 0, other: 0 };
    const name = typeof p.name === "string" ? p.name.trim() : "";
    return {
      projectId: id,
      projectName: name || id,
      ...b,
    };
  });
}

/**
 * Active risks (Open / Monitoring / Mitigating only) in the portfolio, grouped by the same rating logic as the
 * risk register: Open/Monitoring use pre-mitigation; Mitigating uses post-mitigation.
 * Prefer {@link loadPortfolioTopRiskConcentrationRows} when loading portfolio overview data to avoid duplicate queries.
 */
export async function loadPortfolioProjectRiskSeveritySummary(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<PortfolioProjectRiskSeverityRow[]> {
  const { data: projects, error: pErr } = await supabase
    .from("visualify_projects")
    .select("id, name")
    .eq("portfolio_id", portfolioId)
    .order("name", { ascending: true });

  if (pErr || !projects?.length) return [];

  const ids = projects.map((p) => p.id as string);

  const { data: risksRaw, error: rErr } = await supabase
    .from("riskai_risks")
    .select(RISK_DB_SELECT_COLUMNS)
    .in("project_id", ids);

  if (rErr) return buildPortfolioProjectRiskSeverityRowsFromRiskRows(projects, []);
  return buildPortfolioProjectRiskSeverityRowsFromRiskRows(projects, (risksRaw ?? []) as RiskRow[]);
}

function scheduleContingencyWeeksFromRow(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Per-project financial + schedule contingency from `visualify_project_settings` (same semantics as portfolio KPI). */
export type PortfolioProjectContingencyRow = {
  projectId: string;
  projectName: string;
  /** Absolute amount in `currency` (not millions). */
  contingencyAmountAbs: number;
  currency: ProjectCurrency;
  scheduleContingencyWeeks: number | null;
};

export async function loadPortfolioProjectContingencyTable(
  supabase: SupabaseClient,
  portfolioId: string
): Promise<PortfolioProjectContingencyRow[]> {
  const { data: projects, error: pErr } = await supabase
    .from("visualify_projects")
    .select("id, name")
    .eq("portfolio_id", portfolioId)
    .order("name", { ascending: true });

  if (pErr || !projects?.length) return [];

  const ids = projects.map((p) => p.id as string);

  const { data: settingsRows } = await supabase
    .from("visualify_project_settings")
    .select(
      "project_id, contingency_value_input, financial_unit, currency, schedule_contingency_weeks, financial_inputs_version"
    )
    .in("project_id", ids);

  const byProject = new Map<string, ProjectSettingsContingencyRow & { schedule_contingency_weeks?: unknown }>();
  for (const row of settingsRows ?? []) {
    const pid = typeof row.project_id === "string" ? row.project_id : "";
    if (pid) byProject.set(pid, row as ProjectSettingsContingencyRow & { schedule_contingency_weeks?: unknown });
  }

  return projects.map((p) => {
    const id = p.id as string;
    const s = byProject.get(id);
    const m = s ? contingencyMillionsFromSettingsRow(s) : 0;
    const contingencyAmountAbs = m * 1_000_000;
    const currency: ProjectCurrency = s ? asProjectCurrency(s.currency) : "AUD";
    const scheduleContingencyWeeks = s ? scheduleContingencyWeeksFromRow(s.schedule_contingency_weeks) : null;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    return {
      projectId: id,
      projectName: name || id,
      contingencyAmountAbs,
      currency,
      scheduleContingencyWeeks,
    };
  });
}

/** Per-project coverage ratio row: contingency held vs forward cost exposure. */
export type PortfolioProjectCoverageRow = {
  projectId: string;
  projectName: string;
  /** Contingency held in absolute units of `currency` (matches `contingencyAmountAbs` in ContingencyRow). */
  contingencyAmountAbs: number;
  /** Forward cost exposure in absolute units of `currency` (from exposure engine). 0 if no cost risks. */
  exposureAmountAbs: number;
  currency: ProjectCurrency;
  /** contingencyAmountAbs / exposureAmountAbs; null when exposureAmountAbs === 0. */
  ratio: number | null;
};

/** Row shape for portfolio Top 5 Cost / Top 5 Schedule concentration tables. */
export type PortfolioTopRiskRow = {
  projectId: string;
  projectName: string;
  riskId: string;
  riskTitle: string;
  ownerDisplay: string;
  statusDisplay: string;
  rating: string;
  exposureDisplay: string;
};

/** Active High / Extreme risks by register rating, missing an owner and/or a mitigation description. */
export type PortfolioRisksRequiringAttentionRow = {
  projectId: string;
  projectName: string;
  riskId: string;
  riskTitle: string;
  rating: string;
  ownerDisplay: string;
  issueLabel: string;
};

function attentionIssueLabel(risk: Risk): string {
  const noMit = !risk.mitigation?.trim();
  const noOwner = !risk.owner?.trim();
  if (noMit && noOwner) return "No owner; no mitigation plan";
  if (noMit) return "No mitigation plan";
  return "No owner";
}

function portfolioTopRiskStatusDisplay(risk: Risk): string {
  const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
  if (bucket === "open") return "Open";
  if (bucket === "monitoring") return "Monitoring";
  if (bucket === "mitigating") return "Mitigating";
  if (bucket === "closed") return "Closed";
  if (bucket === "archived") return "Archived";
  return "Draft";
}

/**
 * Pre-mitigation expected cost (inherent impact × probability), aligned with
 * {@link buildCostDriverLines} — basis for “opportunity” = pre − forward exposure.
 */
function preMitigationCostExpected(risk: Risk): number {
  return preMitigationCostExpectedForOpportunity(risk);
}

const PORTFOLIO_COST_EXPOSURE_HORIZON_MONTHS = 12;

/**
 * Expected schedule impact (days): probability × lifecycle-appropriate capped impact days
 * (Open/Monitoring → pre; Mitigating → post or pre fallback), aligned with {@link simulatePortfolio}.
 */
function expectedScheduleExposureDays(risk: Risk): number {
  const prob01 = riskTriggerProbability01(risk);
  const impactDays = scheduleImpactDaysMLCappedForMonteCarlo(risk);
  const v = impactDays * prob01;
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

/** Per-project aggregate forward cost exposure (same engine as Top 5 cost; summed per project). */
export type PortfolioProjectCostExposureSlice = {
  projectId: string;
  projectName: string;
  /** Raw portfolio exposure total for that project's cost risks. */
  value: number;
  currency: ProjectCurrency;
};

/** Per-project sum of expected schedule exposure (probability × lifecycle schedule days per risk), in days. */
export type PortfolioProjectScheduleExposureSlice = {
  projectId: string;
  projectName: string;
  valueDays: number;
};

/**
 * Per-project expected schedule delay (weeks), schedule contingency held (weeks), and coverage — joined from
 * {@link loadPortfolioProjectContingencyTable} + schedule exposure slices (same basis as the schedule donut).
 */
export type PortfolioProjectScheduleCoverageRow = {
  projectId: string;
  projectName: string;
  /** Expected delay in weeks (`valueDays` / 7 from the schedule exposure engine). */
  expectedDelayWeeks: number;
  /** Schedule contingency from project settings; null when unset. */
  scheduleContingencyWeeks: number | null;
  /** `scheduleContingencyWeeks` ÷ `expectedDelayWeeks` when exposure is positive. */
  coverageRatio: number | null;
};

/** Risk counts by category across the portfolio (active risks only). */
export type PortfolioRiskCategoryCount = {
  category: string;
  count: number;
};

/** Portfolio lifecycle bucket counts (Open / Monitoring / Mitigating, plus Closed). */
export type PortfolioRiskStatusCount = {
  statusKey: "open" | "monitoring" | "mitigating" | "closed";
  label: string;
  count: number;
};

function buildPortfolioRiskStatusCounts(allMapped: Risk[]): PortfolioRiskStatusCount[] {
  const totals = new Map<PortfolioRiskStatusCount["statusKey"], number>([
    ["open", 0],
    ["monitoring", 0],
    ["mitigating", 0],
    ["closed", 0],
  ]);

  for (const risk of allMapped) {
    const bucket = riskLifecycleBucketForRegisterSnapshot(risk);
    if (bucket === "open" || bucket === "monitoring" || bucket === "mitigating" || bucket === "closed") {
      totals.set(bucket, (totals.get(bucket) ?? 0) + 1);
    }
  }

  const order: { key: PortfolioRiskStatusCount["statusKey"]; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "monitoring", label: "Monitoring" },
    { key: "mitigating", label: "Mitigating" },
    { key: "closed", label: "Closed" },
  ];

  return order
    .map(({ key, label }) => ({ statusKey: key, label, count: totals.get(key) ?? 0 }))
    .filter((r) => r.count > 0);
}

/** Active risks by owner (free-text); empty owner → `Unassigned`. */
export type PortfolioRiskOwnerCount = {
  owner: string;
  count: number;
};

function buildPortfolioRiskOwnerCounts(allMapped: Risk[]): PortfolioRiskOwnerCount[] {
  const totals = new Map<string, number>();
  for (const risk of allMapped) {
    if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
    const raw = typeof risk.owner === "string" ? risk.owner.trim() : "";
    const owner = raw.length > 0 ? raw : "Unassigned";
    totals.set(owner, (totals.get(owner) ?? 0) + 1);
  }
  return [...totals.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));
}

export type PortfolioTopRiskConcentration = {
  /** Open + Monitoring + Mitigating; matches portfolio dashboard tiles. */
  activeRiskCount: number;
  /** Per-project register-aligned severity (active risks) — Risks by severity card. */
  activeRiskSummaryRows: PortfolioProjectRiskSeverityRow[];
  /** Per-project lifecycle counts — Active Risks KPI modal. */
  activeRiskStatusSummaryRows: PortfolioProjectRiskStatusRow[];
  costRows: PortfolioTopRiskRow[];
  scheduleRows: PortfolioTopRiskRow[];
  /** Largest monitoring-only cost reductions still available from planned mitigation. */
  costOpportunityRows: PortfolioTopRiskRow[];
  /** Largest monitoring-only schedule reductions still available from planned mitigation. */
  scheduleOpportunityRows: PortfolioTopRiskRow[];
  projectCostExposureSlices: PortfolioProjectCostExposureSlice[];
  projectScheduleExposureSlices: PortfolioProjectScheduleExposureSlice[];
  riskCategoryCounts: PortfolioRiskCategoryCount[];
  riskStatusCounts: PortfolioRiskStatusCount[];
  riskOwnerCounts: PortfolioRiskOwnerCount[];
  risksRequiringAttentionRows: PortfolioRisksRequiringAttentionRow[];
  /** Composite 0–100 health run for the Needs Attention KPI (tile + modal). */
  needsAttentionHealthRun: PortfolioNeedsAttentionHealthRun;
};

/** Optional scoping for portfolio overview when a reporting month is selected in the URL. */
export type LoadPortfolioTopRiskConcentrationOptions = {
  reportingMonthYear?: string | null;
  /** Same project IDs as reporting tiles for that month (from {@link loadPortfolioProjectTilePayloads}). */
  restrictProjectIds?: string[] | null;
};

function reportingLockStaleForPortfolio(lockAt: string | null, nowMs: number): boolean {
  if (lockAt == null || lockAt === "") return true;
  const t = new Date(lockAt).getTime();
  if (!Number.isFinite(t)) return true;
  return nowMs - t > REPORTING_LOCK_STALE_MS;
}

/**
 * Loads Top 5 cost (forward-exposure engine) and Top 5 schedule (expected delay in days) across the portfolio.
 * Single fetch of projects + risks.
 */
export async function loadPortfolioTopRiskConcentrationRows(
  supabase: SupabaseClient,
  portfolioId: string,
  reportingUnit: ReportingUnitOption = DEFAULT_REPORTING_UNIT,
  options?: LoadPortfolioTopRiskConcentrationOptions
): Promise<PortfolioTopRiskConcentration> {
  const empty: PortfolioTopRiskConcentration = {
    activeRiskCount: 0,
    activeRiskSummaryRows: [],
    activeRiskStatusSummaryRows: [],
    costRows: [],
    scheduleRows: [],
    costOpportunityRows: [],
    scheduleOpportunityRows: [],
    projectCostExposureSlices: [],
    projectScheduleExposureSlices: [],
    riskCategoryCounts: [],
    riskStatusCounts: [],
    riskOwnerCounts: [],
    risksRequiringAttentionRows: [],
    needsAttentionHealthRun: {
      healthScore: 100,
      primaryRagDot: "green",
      projectsWithActiveRisksCount: 0,
      staleSimulationProjectCount: 0,
      topDriverPoolSize: 0,
      topDriversWithoutMitigationCount: 0,
      materialOpportunityProjectCount: 0,
      registerGapCount: 0,
    },
  };

  const { data: projects, error: pErr } = await supabase
    .from("visualify_projects")
    .select("id, name")
    .eq("portfolio_id", portfolioId)
    .order("name", { ascending: true });

  if (pErr || !projects?.length) return empty;

  const projectNameById = new Map<string, string>();
  const projectIds = projects.map((p) => {
    const id = p.id as string;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    projectNameById.set(id, name || id);
    return id;
  });

  const reportingMonthYearOpt = options?.reportingMonthYear?.trim();
  const restrictIdsOpt =
    reportingMonthYearOpt != null ? options?.restrictProjectIds : undefined;

  if (reportingMonthYearOpt != null && restrictIdsOpt != null && restrictIdsOpt.length === 0) {
    return empty;
  }

  const effectiveProjectIds =
    reportingMonthYearOpt != null && restrictIdsOpt != null && restrictIdsOpt.length > 0
      ? restrictIdsOpt.filter((id) => projectIds.includes(id))
      : projectIds;

  if (effectiveProjectIds.length === 0) {
    return empty;
  }

  const monthScopedConcentration =
    reportingMonthYearOpt != null &&
    restrictIdsOpt != null &&
    restrictIdsOpt.length > 0 &&
    effectiveProjectIds.length > 0;

  const projectsForSummaryRows = projects.filter((p) =>
    effectiveProjectIds.includes(p.id as string)
  );

  const { data: settingsRows } = await supabase
    .from("visualify_project_settings")
    .select("project_id, currency")
    .in("project_id", effectiveProjectIds);

  const currencyByProject = new Map<string, ProjectCurrency>();
  for (const row of settingsRows ?? []) {
    const pid = typeof row.project_id === "string" ? row.project_id : "";
    if (!pid) continue;
    currencyByProject.set(pid, asProjectCurrency(row.currency));
  }

  const snapshotQuery = monthScopedConcentration
    ? supabase
        .from("riskai_simulation_snapshots")
        .select("project_id, created_at, locked_at")
        .in("project_id", effectiveProjectIds)
        .eq("locked_for_reporting", true)
        .eq("report_month", `${reportingMonthYearOpt}-01`)
    : supabase
        .from("riskai_simulation_snapshots")
        .select("project_id, created_at")
        .in("project_id", effectiveProjectIds);

  const [
    { data: riskRowsRaw, error: rErr },
    { data: snapshotRowsRaw, error: sErr },
  ] = await Promise.all([
    supabase.from("riskai_risks").select(RISK_DB_SELECT_COLUMNS).in("project_id", effectiveProjectIds),
    snapshotQuery,
  ]);

  if (rErr) return empty;

  const riskRows = (riskRowsRaw ?? []) as RiskRow[];
  const projectIdByRiskId = new Map<string, string>();
  for (const row of riskRows) {
    projectIdByRiskId.set(row.id, row.project_id);
  }

  const latestSimulationAtByProject = new Map<string, string | null>();
  const reportingLockCompletedAtByProject = new Map<string, string | null>();
  for (const pid of effectiveProjectIds) {
    latestSimulationAtByProject.set(pid, null);
    reportingLockCompletedAtByProject.set(pid, null);
  }

  if (monthScopedConcentration) {
    const rows = (snapshotRowsRaw ?? []) as {
      project_id?: string;
      created_at?: string | null;
      locked_at?: string | null;
    }[];
    const sorted = [...rows].sort((a, b) => {
      const ta = new Date(a.locked_at ?? a.created_at ?? 0).getTime();
      const tb = new Date(b.locked_at ?? b.created_at ?? 0).getTime();
      return tb - ta;
    });
    for (const row of sorted) {
      const pid = typeof row.project_id === "string" ? row.project_id : "";
      if (!pid || reportingLockCompletedAtByProject.get(pid) != null) continue;
      reportingLockCompletedAtByProject.set(pid, row.locked_at ?? row.created_at ?? null);
    }
  } else {
    for (const row of snapshotRowsRaw ?? []) {
      const raw = row as { project_id?: string; created_at?: string | null };
      const pid = typeof raw.project_id === "string" ? raw.project_id : "";
      if (!pid) continue;
      const ca = typeof raw.created_at === "string" ? raw.created_at : null;
      const cur = latestSimulationAtByProject.get(pid) ?? null;
      if (cur == null || (ca != null && new Date(ca).getTime() > new Date(cur).getTime())) {
        latestSimulationAtByProject.set(pid, ca);
      }
    }
  }

  const allMapped = riskRows.map(mapRiskRowToDomain);

  const activeRisksByProject = new Map<string, number>();
  for (const risk of allMapped) {
    if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
    const pid = projectIdByRiskId.get(risk.id);
    if (!pid) continue;
    activeRisksByProject.set(pid, (activeRisksByProject.get(pid) ?? 0) + 1);
  }

  const activeRiskCount = allMapped.filter(isRiskActiveForPortfolioAnalytics).length;

  const categoryTotals = new Map<string, number>();
  for (const risk of allMapped) {
    if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
    const raw = typeof risk.category === "string" ? risk.category.trim() : "";
    const cat = raw.length > 0 ? raw : "Uncategorized";
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + 1);
  }
  const riskCategoryCounts: PortfolioRiskCategoryCount[] = [...categoryTotals.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const riskStatusCounts = buildPortfolioRiskStatusCounts(allMapped);
  const riskOwnerCounts = buildPortfolioRiskOwnerCounts(allMapped);

  const costRisks = allMapped.filter(
    (risk) =>
      isRiskActiveForPortfolioAnalytics(risk) &&
      !appliesToExcludesCost(risk.appliesTo) &&
      typeof risk.preMitigationCostML === "number" &&
      risk.preMitigationCostML > 0
  );

  const costRows: PortfolioTopRiskRow[] = [];
  const costOpportunityRows: PortfolioTopRiskRow[] = [];
  if (costRisks.length > 0) {
    const exposure = computePortfolioExposure(costRisks, "neutral", PORTFOLIO_COST_EXPOSURE_HORIZON_MONTHS, {
      topN: 5,
      includeDebug: true,
    });
    for (const d of exposure.topDrivers) {
      const risk = costRisks.find((r) => r.id === d.riskId);
      if (!risk) continue;
      const projectId = projectIdByRiskId.get(d.riskId) ?? "";
      const projectName = projectNameById.get(projectId) ?? projectId;
      const currency = currencyByProject.get(projectId) ?? "AUD";
      costRows.push({
        projectId,
        projectName,
        riskId: d.riskId,
        riskTitle: risk.title,
        ownerDisplay: risk.owner?.trim() ? risk.owner.trim() : "Unassigned",
        statusDisplay: portfolioTopRiskStatusDisplay(risk),
        rating: getCurrentRiskRatingLetter(risk),
        exposureDisplay: formatCurrencyInReportingUnit(d.total, currency, reportingUnit, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      });
    }

    const curves = exposure.debug?.riskCurves ?? [];
    const costOpportunityCandidates = curves
      .map((c) => {
        const risk = costRisks.find((r) => r.id === c.riskId);
        if (!risk) return null;
        const delta = monitoringCostOpportunityExpected(risk);
        if (delta == null || !Number.isFinite(delta) || delta <= 0) return null;
        const projectId = projectIdByRiskId.get(risk.id) ?? "";
        const currency = currencyByProject.get(projectId) ?? "AUD";
        return { risk, delta, projectId, currency };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);

    for (const { risk, delta, projectId, currency } of costOpportunityCandidates) {
      costOpportunityRows.push({
        projectId,
        projectName: projectNameById.get(projectId) ?? projectId,
        riskId: risk.id,
        riskTitle: risk.title,
        ownerDisplay: risk.owner?.trim() ? risk.owner.trim() : "Unassigned",
        statusDisplay: portfolioTopRiskStatusDisplay(risk),
        rating: getCurrentRiskRatingLetter(risk),
        exposureDisplay: formatCurrencyInReportingUnit(delta, currency, reportingUnit, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      });
    }
  }

  const scheduleCandidates = allMapped.filter(
    (risk) =>
      isRiskActiveForPortfolioAnalytics(risk) &&
      !appliesToExcludesTime(risk.appliesTo) &&
      scheduleImpactDaysMLCappedForMonteCarlo(risk) > 0
  );

  const scheduleRows: PortfolioTopRiskRow[] = [];
  const scheduleOpportunityRows: PortfolioTopRiskRow[] = [];
  if (scheduleCandidates.length > 0) {
    const scored = scheduleCandidates
      .map((risk) => ({
        risk,
        score: expectedScheduleExposureDays(risk),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const { risk, score } of scored) {
      const projectId = projectIdByRiskId.get(risk.id) ?? "";
      const projectName = projectNameById.get(projectId) ?? projectId;
      scheduleRows.push({
        projectId,
        projectName,
        riskId: risk.id,
        riskTitle: risk.title,
        ownerDisplay: risk.owner?.trim() ? risk.owner.trim() : "Unassigned",
        statusDisplay: portfolioTopRiskStatusDisplay(risk),
        rating: getCurrentRiskRatingLetter(risk),
        exposureDisplay: formatDurationWholeDays(score),
      });
    }

    const scheduleOpportunityCandidates = scheduleCandidates
      .map((risk) => {
        const delta = monitoringScheduleOpportunityExpected(risk);
        if (delta == null || !Number.isFinite(delta) || delta <= 0) return null;
        return { risk, delta };
      })
      .filter((x): x is { risk: Risk; delta: number } => x != null)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);

    for (const { risk, delta } of scheduleOpportunityCandidates) {
      const projectId = projectIdByRiskId.get(risk.id) ?? "";
      scheduleOpportunityRows.push({
        projectId,
        projectName: projectNameById.get(projectId) ?? projectId,
        riskId: risk.id,
        riskTitle: risk.title,
        ownerDisplay: risk.owner?.trim() ? risk.owner.trim() : "Unassigned",
        statusDisplay: portfolioTopRiskStatusDisplay(risk),
        rating: getCurrentRiskRatingLetter(risk),
        exposureDisplay: formatDurationWholeDays(delta),
      });
    }
  }

  const projectCostExposureSlices: PortfolioProjectCostExposureSlice[] = [];
  for (const pid of effectiveProjectIds) {
    const projectCosts = costRisks.filter((r) => projectIdByRiskId.get(r.id) === pid);
    if (projectCosts.length === 0) continue;
    const pe = computePortfolioExposure(projectCosts, "neutral", PORTFOLIO_COST_EXPOSURE_HORIZON_MONTHS, {
      topN: 50,
      includeDebug: false,
    });
    if (!Number.isFinite(pe.total) || pe.total <= 0) continue;
    projectCostExposureSlices.push({
      projectId: pid,
      projectName: projectNameById.get(pid) ?? pid,
      value: pe.total,
      currency: currencyByProject.get(pid) ?? "AUD",
    });
  }
  projectCostExposureSlices.sort((a, b) => b.value - a.value);

  const scheduleTotalsByProject = new Map<string, number>();
  for (const risk of scheduleCandidates) {
    const pid = projectIdByRiskId.get(risk.id);
    if (!pid) continue;
    const d = expectedScheduleExposureDays(risk);
    if (!Number.isFinite(d) || d <= 0) continue;
    scheduleTotalsByProject.set(pid, (scheduleTotalsByProject.get(pid) ?? 0) + d);
  }

  const projectScheduleExposureSlices: PortfolioProjectScheduleExposureSlice[] = [];
  for (const [pid, valueDays] of scheduleTotalsByProject) {
    if (!Number.isFinite(valueDays) || valueDays <= 0) continue;
    projectScheduleExposureSlices.push({
      projectId: pid,
      projectName: projectNameById.get(pid) ?? pid,
      valueDays,
    });
  }
  projectScheduleExposureSlices.sort((a, b) => b.valueDays - a.valueDays);

  const risksRequiringAttentionRows: PortfolioRisksRequiringAttentionRow[] = [];
  for (const risk of allMapped) {
    if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
    const level = getCurrentRiskRatingLevel(risk);
    if (level == null) continue;
    if (level !== "high" && level !== "extreme") continue;
    const hasNoMitigation = !risk.mitigation?.trim();
    const hasNoOwner = !risk.owner?.trim();
    if (!(hasNoMitigation || hasNoOwner)) continue;
    const pid = projectIdByRiskId.get(risk.id) ?? "";
    risksRequiringAttentionRows.push({
      projectId: pid,
      projectName: projectNameById.get(pid) ?? pid,
      riskId: risk.id,
      riskTitle: risk.title,
      rating: getCurrentRiskRatingLetter(risk),
      ownerDisplay: risk.owner?.trim() ? risk.owner.trim() : "Unassigned",
      issueLabel: attentionIssueLabel(risk),
    });
  }
  risksRequiringAttentionRows.sort((a, b) => {
    const pn = a.projectName.localeCompare(b.projectName);
    if (pn !== 0) return pn;
    return a.riskTitle.localeCompare(b.riskTitle);
  });

  const now = new Date();
  const nowMs = now.getTime();
  let projectsWithActiveRisksCount = 0;
  let staleSimulationProjectCount = 0;
  if (sErr) {
    for (const pid of effectiveProjectIds) {
      const n = activeRisksByProject.get(pid) ?? 0;
      if (n <= 0) continue;
      projectsWithActiveRisksCount += 1;
      staleSimulationProjectCount += 1;
    }
  } else if (monthScopedConcentration) {
    for (const pid of effectiveProjectIds) {
      const n = activeRisksByProject.get(pid) ?? 0;
      if (n <= 0) continue;
      projectsWithActiveRisksCount += 1;
      const lockAt = reportingLockCompletedAtByProject.get(pid) ?? null;
      if (reportingLockStaleForPortfolio(lockAt, nowMs)) staleSimulationProjectCount += 1;
    }
  } else {
    for (const pid of effectiveProjectIds) {
      const n = activeRisksByProject.get(pid) ?? 0;
      if (n <= 0) continue;
      projectsWithActiveRisksCount += 1;
      const latest = latestSimulationAtByProject.get(pid) ?? null;
      if (!simulationTimestampInCurrentUtcMonth(latest, now)) staleSimulationProjectCount += 1;
    }
  }

  const topDriverIds = new Set<string>();
  for (const r of costRows.slice(0, 5)) topDriverIds.add(r.riskId);
  for (const r of scheduleRows.slice(0, 5)) topDriverIds.add(r.riskId);
  const riskById = new Map(allMapped.map((x) => [x.id, x] as const));
  let topDriversWithoutMitigationCount = 0;
  for (const id of topDriverIds) {
    const rk = riskById.get(id);
    if (rk != null && !rk.mitigation?.trim()) topDriversWithoutMitigationCount += 1;
  }
  const topDriverPoolSize = topDriverIds.size;

  const materialOppProjects = new Set<string>();
  for (const r of costOpportunityRows) materialOppProjects.add(r.projectId);
  for (const r of scheduleOpportunityRows) materialOppProjects.add(r.projectId);
  const materialOpportunityProjectCount = materialOppProjects.size;

  const registerGapCount = risksRequiringAttentionRows.length;
  const { healthScore, primaryRagDot } = computeNeedsAttentionHealthRun({
    staleSimulationProjectCount,
    registerGapCount,
    topDriversWithoutMitigationCount,
  });

  const needsAttentionHealthRun: PortfolioNeedsAttentionHealthRun = {
    healthScore,
    primaryRagDot,
    projectsWithActiveRisksCount,
    staleSimulationProjectCount,
    topDriverPoolSize,
    topDriversWithoutMitigationCount,
    materialOpportunityProjectCount,
    registerGapCount,
  };

  const activeRiskSummaryRows = buildPortfolioProjectRiskSeverityRowsFromRiskRows(
    projectsForSummaryRows,
    riskRows
  );
  const activeRiskStatusSummaryRows = buildPortfolioProjectRiskStatusRowsFromRiskRows(
    projectsForSummaryRows,
    riskRows
  );

  return {
    activeRiskCount,
    activeRiskSummaryRows,
    activeRiskStatusSummaryRows,
    costRows,
    scheduleRows,
    costOpportunityRows,
    scheduleOpportunityRows,
    projectCostExposureSlices,
    projectScheduleExposureSlices,
    riskCategoryCounts,
    riskStatusCounts,
    riskOwnerCounts,
    risksRequiringAttentionRows,
    needsAttentionHealthRun,
  };
}

export async function loadPortfolioProjectTilePayloads(
  supabase: SupabaseClient,
  portfolioId: string,
  loadOptions?: { reportingMonthYear?: string | null }
): Promise<LoadPortfolioProjectTilePayloadsResult> {
  const { data: projects, error } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: true });

  if (error || !projects?.length) {
    return { projectTilePayloads: [], portfolioReportingFooter: null, totalProjectsInPortfolio: 0 };
  }

  const asAccessible: AccessibleProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
  }));

  const reportingMonthYear = loadOptions?.reportingMonthYear?.trim();
  const { projectTilePayloads, portfolioReportingFooter } = await getProjectTilePayloads(
    supabase,
    asAccessible,
    {
      onlyProjectsWithLockedReporting: true,
      ...(reportingMonthYear ? { reportingMonthYear } : {}),
    }
  );
  return {
    projectTilePayloads: sortProjectTilesAlphabetically(projectTilePayloads),
    portfolioReportingFooter,
    totalProjectsInPortfolio: projects.length,
  };
}
