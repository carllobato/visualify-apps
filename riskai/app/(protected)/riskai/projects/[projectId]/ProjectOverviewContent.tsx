"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useEffect, useState } from "react";
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { buildSimulationFromDbRow, useRiskRegister } from "@/store/risk-register.store";
import { listRisks } from "@/lib/db/risks";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  loadProjectContext,
  parseProjectContextFromVisualifyProjectSettingsRow,
  riskAppetiteToPercent,
  type ProjectContext,
  type RiskAppetite,
} from "@/lib/projectContext";
import { PortfolioReportingMonthSelect } from "@/components/PortfolioReportingMonthSelect";
import type { SimulationSnapshotRow, SimulationSnapshotRowDb } from "@/lib/db/snapshots";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDurationDays } from "@/lib/formatDuration";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import { usePageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import {
  PortfolioCategoryBreakdownTrigger,
  PortfolioRiskCategoryCountsTable,
} from "@/components/dashboard/PortfolioRiskCategoryCountsTable";
import { PortfolioRiskSeverityCountsTable } from "@/components/dashboard/PortfolioRiskSeverityCountsTable";
import {
  PortfolioOwnerBreakdownTrigger,
  PortfolioRiskOwnerCountsTable,
} from "@/components/dashboard/PortfolioRiskOwnerCountsTable";
import { PortfolioRiskStatusCountsTable } from "@/components/dashboard/PortfolioRiskStatusCountsTable";
import {
  DocumentKpiModal,
  KPI_MODAL_REGISTER_TABLE_CLASS,
  PROJECT_HEALTH_KPI_TITLE,
  PROJECT_RISK_RATING_KPI_TITLE,
  type DocumentKpiTileItem,
} from "@/components/dashboard/DocumentKpiModal";
import { SummaryTile } from "@/components/dashboard/SummaryTile";
import type { Risk } from "@/domain/risk/risk.schema";
import {
  getCurrentRiskRatingLevel,
  isRiskActiveForPortfolioAnalytics,
  riskLifecycleBucketForRegisterSnapshot,
} from "@/domain/risk/riskFieldSemantics";
import {
  applyStaleReportingLockRag,
  buildProjectTilePayloadForReportingModal,
  computeRag,
  reportingLockStaleForPortfolio,
  type PortfolioNeedsAttentionHealthRun,
  type RagStatus,
} from "@/lib/dashboard/projectTileServerData";
import { computeNeedsAttentionHealthRun } from "@/lib/dashboard/needsAttentionHealthRun";
import { monitoringCostOpportunityExpected, monitoringScheduleOpportunityExpected } from "@/lib/opportunityMetrics";
import {
  tryReportingBreakdownFromLockedRowAndSettings,
  type ReportingLineSeverity,
} from "@/lib/dashboard/reportingPositionRag";
import {
  buildCostDriverLines,
  buildScheduleDriverLines,
  computeNeutralForwardExposure,
  costDriverExposureUsd,
  currentFundingConfidenceLabelFromNeutral,
  currentScheduleConfidenceLabelFromNeutral,
  interpolateModeledTotalCostAtRiskPercentile,
  interpolateSnapshotAtRiskPercentile,
  modeledTotalCostMeanDollars,
  optionalBufferFromSnapshotPayload,
  rankCostDriverLinesWithDelayCommercial,
  isSimulationDelayCommercialCostDriverRiskId,
  topCostRiskTitleFromSnapshotPayload,
  topTimeRiskTitleFromSnapshotPayload,
  reportingRunActiveRiskCount,
  reportingRunHighExtremeCount,
} from "@/lib/projectOverviewReporting";
import type {
  PortfolioProjectRiskSeverityRow,
  PortfolioRiskCategoryCount,
  PortfolioRiskOwnerCount,
  PortfolioRiskStatusCount,
} from "@/lib/dashboard/projectTileServerData";
import type { MonteCarloNeutralSnapshot, SimulationSnapshot } from "@/domain/simulation/simulation.types";
import {
  binSamplesIntoHistogram,
  binSamplesIntoTimeHistogram,
  deriveCostHistogramFromPercentiles,
  deriveTimeHistogramFromPercentiles,
  type DistributionPoint,
  type TimeDistributionPoint,
} from "@/lib/simulationDisplayUtils";

const OVERVIEW_EXPOSURE_HISTOGRAM_BINS = 32;
const EXPOSURE_HISTOGRAM_HEIGHT = 170;
const EXPOSURE_CHART_MARGIN = { top: 8, right: 8, left: 4, bottom: 4 };

/** Same chrome as `SummaryTile` / portfolio KPI tiles (document tile tokens + hover). */
const overviewDocumentTileClass = "ds-document-tile-panel ds-document-tile-panel--interactive";

/** Tile section label: aligned with `SummaryTile` title typography. */
const overviewTileTitleClass = "text-sm font-medium text-[var(--ds-text-secondary)] m-0 mb-1";

/** Max rows for executive-driver modal tables (5 visible + “show 5 more”). */
const EXEC_DRIVER_MODAL_ROW_CAP = 10;
/** Initial visible rows before expanding in driver modals. */
const EXEC_DRIVER_MODAL_INITIAL_ROWS = 5;
/** Placeholder slides 4–12 for project overview modal cycling (body from `renderSlideBodyByIndex`). */
const PROJECT_OVERVIEW_MODAL_EXTRA_TILES: DocumentKpiTileItem[] = [
  { title: "Cost Exposure", primaryValue: "—" },
  { title: "Schedule Exposure", primaryValue: "—" },
  { title: "Key Cost Drivers", primaryValue: "—" },
  { title: "Key Schedule Drivers", primaryValue: "—" },
  { title: "Key Opportunities", primaryValue: "—" },
  { title: "Status", primaryValue: "—" },
  { title: "Severity", primaryValue: "—" },
  { title: "Category", primaryValue: "—" },
  { title: "Owner", primaryValue: "—" },
];

function costHistogramFromReporting(
  row: SimulationSnapshotRowDb,
  neutral: MonteCarloNeutralSnapshot | null
): DistributionPoint[] {
  const raw = row.payload?.distributions?.costHistogram;
  if (Array.isArray(raw) && raw.length > 0) {
    const mapped = raw
      .map((b) => {
        const rec = b as { cost?: unknown; frequency?: unknown };
        const cost = Number(rec.cost);
        const frequency = Number(rec.frequency);
        return Number.isFinite(cost) && Number.isFinite(frequency) ? { cost, frequency } : null;
      })
      .filter((x): x is DistributionPoint => x != null);
    if (mapped.length > 0) return mapped;
  }
  if (!neutral?.summary) return [];
  const samples = neutral.costSamples ?? [];
  if (samples.length > 0) {
    return binSamplesIntoHistogram(samples, OVERVIEW_EXPOSURE_HISTOGRAM_BINS);
  }
  const s = neutral.summary;
  return deriveCostHistogramFromPercentiles(
    {
      p20Cost: s.p20Cost,
      p50Cost: s.p50Cost,
      p80Cost: s.p80Cost,
      p90Cost: s.p90Cost,
    },
    OVERVIEW_EXPOSURE_HISTOGRAM_BINS
  );
}

function timeHistogramFromReporting(
  row: SimulationSnapshotRowDb,
  neutral: MonteCarloNeutralSnapshot | null
): TimeDistributionPoint[] {
  const raw = row.payload?.distributions?.timeHistogram;
  if (Array.isArray(raw) && raw.length > 0) {
    const mapped = raw
      .map((b) => {
        const rec = b as { time?: unknown; frequency?: unknown };
        const time = Number(rec.time);
        const frequency = Number(rec.frequency);
        return Number.isFinite(time) && Number.isFinite(frequency) ? { time, frequency } : null;
      })
      .filter((x): x is TimeDistributionPoint => x != null);
    if (mapped.length > 0) return mapped;
  }
  if (!neutral?.summary) return [];
  const samples = neutral.timeSamples ?? [];
  if (samples.length > 0) {
    return binSamplesIntoTimeHistogram(samples, OVERVIEW_EXPOSURE_HISTOGRAM_BINS);
  }
  const s = neutral.summary;
  return deriveTimeHistogramFromPercentiles(
    {
      p20Time: s.p20Time,
      p50Time: s.p50Time,
      p80Time: s.p80Time,
      p90Time: s.p90Time,
    },
    OVERVIEW_EXPOSURE_HISTOGRAM_BINS
  );
}

type ExposureBarDatum = { x: number; h: number };

function toBarDataCost(distribution: DistributionPoint[]): ExposureBarDatum[] {
  if (distribution.length === 0) return [];
  const maxF = Math.max(...distribution.map((d) => d.frequency), 1e-9);
  const out = distribution.map((d) => ({ x: d.cost, h: (d.frequency / maxF) * 100 }));
  out.sort((a, b) => a.x - b.x);
  return out;
}

function toBarDataTime(distribution: TimeDistributionPoint[]): ExposureBarDatum[] {
  if (distribution.length === 0) return [];
  const maxF = Math.max(...distribution.map((d) => d.frequency), 1e-9);
  const out = distribution.map((d) => ({ x: d.time, h: (d.frequency / maxF) * 100 }));
  out.sort((a, b) => a.x - b.x);
  return out;
}

function exposureHistogramDomain(
  data: ExposureBarDatum[],
  targetX: number | null,
  pValueX: number | null = null
): [number, number] {
  const xs = data.map((d) => d.x);
  let lo = xs.length ? Math.min(...xs) : 0;
  let hi = xs.length ? Math.max(...xs) : 1;
  if (targetX != null && Number.isFinite(targetX)) {
    lo = Math.min(lo, targetX);
    hi = Math.max(hi, targetX);
  }
  if (pValueX != null && Number.isFinite(pValueX)) {
    lo = Math.min(lo, pValueX);
    hi = Math.max(hi, pValueX);
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.05 || 1;
    return [lo - pad, hi + pad];
  }
  const span = hi - lo;
  const pad = span * 0.04;
  return [lo - pad, hi + pad];
}

function ProjectExposureHistogramCard({
  title,
  data,
  targetX,
  currentPLineStroke,
  pValueX,
  pValueLabel,
  formatX,
  targetLabel,
  supportingSubline,
  onActivate,
  modalSelected,
  activateAriaLabel,
  embedded,
}: {
  title: string;
  data: ExposureBarDatum[];
  targetX: number | null;
  /** Vertical at contingency / funding ref (legend “Current P”) — solid RAG stroke, aligned with gap tiles. */
  currentPLineStroke: string;
  /** X at funding (cost) or buffer/duration (time) — same ref as “current P” on the CDF. */
  pValueX?: number | null;
  /** e.g. `P28` for legend; optional when `pValueX` set. */
  pValueLabel?: string | null;
  formatX: (n: number) => string;
  targetLabel: string;
  /** Optional muted line below the legend (e.g. contingency). */
  supportingSubline?: string | null;
  onActivate?: () => void;
  modalSelected?: boolean;
  activateAriaLabel?: string;
  /** Chart + legend only (for KPI modal body). */
  embedded?: boolean;
}) {
  const hasData = data.length > 0;
  const showTarget = targetX != null && Number.isFinite(targetX);
  const showPValue = pValueX != null && Number.isFinite(pValueX) && pValueX > 0;
  const domain = exposureHistogramDomain(
    data,
    showTarget ? targetX : null,
    showPValue ? pValueX! : null
  );

  const body = (
    <>
      {!hasData ? (
        <>
          <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] py-10 text-center">
            Unavailable
          </p>
          {supportingSubline ? (
            <p className="m-0 mt-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] opacity-90 leading-snug text-center">
              {supportingSubline}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div
            className="w-full overflow-hidden rounded-[var(--ds-radius-sm)] bg-[var(--ds-chart-surface)]"
            style={{ height: EXPOSURE_HISTOGRAM_HEIGHT }}
            aria-label={title}
          >
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart data={data} margin={EXPOSURE_CHART_MARGIN}>
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={domain}
                  tick={{ fontSize: 9, fill: "var(--ds-text-muted)", fillOpacity: 0.72 }}
                  tickFormatter={(v) => formatX(Number(v))}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis type="number" dataKey="h" domain={[0, 100]} hide width={0} />
                <Bar
                  dataKey="h"
                  fill="var(--ds-text-muted)"
                  fillOpacity={0.28}
                  isAnimationActive={false}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={44}
                />
                {showTarget ? (
                  <ReferenceLine
                    x={targetX!}
                    stroke="var(--ds-text-primary)"
                    strokeOpacity={1}
                    strokeWidth={1.5}
                  />
                ) : null}
                {showPValue ? (
                  <ReferenceLine
                    x={pValueX!}
                    stroke={currentPLineStroke}
                    strokeOpacity={1}
                    strokeWidth={2}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="m-0 mt-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] opacity-90 leading-snug">
            Target {targetLabel}
            {showPValue && pValueLabel != null && pValueLabel.trim() !== ""
              ? " · Current " + pValueLabel.trim()
              : showPValue
                ? " · Current P"
                : ""}
          </p>
          {supportingSubline ? (
            <p className="m-0 mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] opacity-90 leading-snug">
              {supportingSubline}
            </p>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <DashboardCard
      title={title}
      onActivate={onActivate}
      modalSelected={modalSelected}
      activateAriaLabel={activateAriaLabel}
    >
      {body}
    </DashboardCard>
  );
}

function formatSignedDollarGap(meanCost: number | null, appetiteLineCost: number | null): string {
  if (meanCost == null || appetiteLineCost == null) return "—";
  if (!Number.isFinite(meanCost) || !Number.isFinite(appetiteLineCost)) return "—";
  const d = meanCost - appetiteLineCost;
  if (d === 0) return formatCurrency(0);
  const sign = d < 0 ? "-" : "+";
  return `${sign}${formatCurrency(Math.abs(d))}`;
}

/** Signed gap in weeks (mean − target P line), for headline KPI. */
function formatSignedTimeGapWeeks(meanDays: number | null, appetiteLineDays: number | null): string {
  if (meanDays == null || appetiteLineDays == null) return "—";
  if (!Number.isFinite(meanDays) || !Number.isFinite(appetiteLineDays)) return "—";
  const w = (meanDays - appetiteLineDays) / 7;
  if (!Number.isFinite(w)) return "—";
  if (w === 0) return "0 wks";
  const sign = w < 0 ? "-" : "+";
  const abs = Math.abs(w);
  const n = abs < 10 ? abs.toFixed(1) : abs.toFixed(0);
  return `${sign}${n} wks`;
}

/** Maps simulation reporting cost/time line (same as portfolio reporting table). */
function reportingLineSeverityToRag(line: ReportingLineSeverity | null | undefined): RagStatus | undefined {
  if (line == null) return undefined;
  if (line === "on") return "green";
  if (line === "risk") return "amber";
  return "red";
}

function reportingLineSeverityToValueClass(line: ReportingLineSeverity | null | undefined): string {
  if (line == null) return "text-[var(--ds-text-primary)]";
  if (line === "on") return "text-[var(--ds-status-success-fg)]";
  if (line === "risk") return "text-[var(--ds-status-warning-fg)]";
  return "text-[var(--ds-status-danger-fg)]";
}

/**
 * SVG stroke for exposure “Current P” vertical — same RAG resolution as Cost/Time Gap tiles.
 * Uses base `--ds-status-*` tokens (not `*-fg`) so the line matches {@link SummaryTile} RAG dots.
 */
function exposureHistogramCurrentPGapStroke(
  line: ReportingLineSeverity | null | undefined,
  meanMinusAppetite: number | null
): string {
  if (line != null) {
    if (line === "on") return "var(--ds-status-success)";
    if (line === "risk") return "var(--ds-status-warning)";
    return "var(--ds-status-danger)";
  }
  if (meanMinusAppetite == null || !Number.isFinite(meanMinusAppetite)) {
    return "var(--ds-text-primary)";
  }
  if (meanMinusAppetite <= 0) return "var(--ds-status-success)";
  return "var(--ds-status-danger)";
}

export type ProjectOverviewInitialData = {
  projectId: string;
  /** Primary overview row: locked snapshot for the selected month, or latest unlocked snapshot in unpublished mode. */
  reportingSnapshot: SimulationSnapshotRow | null;
  /** Latest locked reporting snapshot for stale/position comparison when `unpublishedMode` is true; otherwise null. */
  lockedReportingBaselineSnapshot: SimulationSnapshotRow | null;
  unpublishedMode: boolean;
  /** From `x-url-search` (middleware) for reporting month control without Suspense. */
  initialUrlSearch: string;
};

type ProjectOverviewContentProps = {
  initialData: ProjectOverviewInitialData;
};

function projectRiskRatingTileCopy(
  status: RagStatus
): { primary: string; primaryValueClassName: string; primaryRagDot: RagStatus } {
  switch (status) {
    case "green":
      return {
        primary: "On Track",
        primaryValueClassName: "text-[var(--ds-status-success-fg)]",
        primaryRagDot: status,
      };
    case "amber":
      return {
        primary: "Watch",
        primaryValueClassName: "text-[var(--ds-status-warning-fg)]",
        primaryRagDot: status,
      };
    case "red":
      return {
        primary: "At risk",
        primaryValueClassName: "text-[var(--ds-status-danger-fg)]",
        primaryRagDot: status,
      };
  }
}

const overviewSkeletonBar = "rounded bg-[var(--ds-surface-muted)]";

function OverviewProjectStatusSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className={`${overviewSkeletonBar} h-8 w-24 max-w-full`} />
      <div className={`${overviewSkeletonBar} h-3 w-40 max-w-full`} />
    </div>
  );
}

function OverviewInsightBodySkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden="true">
      <div className={`${overviewSkeletonBar} h-4 w-full max-w-[18rem]`} />
      <div className={`${overviewSkeletonBar} h-3 w-32 max-w-full`} />
    </div>
  );
}

/** Risk IDs included in the locked reporting snapshot (`payload.risks` ∪ `inputs_used`). */
function reportingRunRiskIdsFromSnapshot(
  current: SimulationSnapshot | undefined,
  reportingSnapshot: SimulationSnapshotRow | null
): Set<string> {
  const ids = new Set<string>();
  for (const r of current?.risks ?? []) {
    if (typeof r.id === "string" && r.id.trim() !== "") ids.add(r.id);
  }
  const inputs = reportingSnapshot?.payload?.inputs_used;
  if (Array.isArray(inputs)) {
    for (const line of inputs) {
      if (typeof line?.risk_id === "string" && line.risk_id.trim() !== "") ids.add(line.risk_id);
    }
  }
  return ids;
}

/** Mirrors {@link projectTileServerData} `buildPortfolioRiskStatusCounts` for a single project’s scoped risks. */
function projectOverviewRiskStatusCounts(allMapped: Risk[]): PortfolioRiskStatusCount[] {
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

function projectOverviewRiskCategoryCounts(allMapped: Risk[]): PortfolioRiskCategoryCount[] {
  const categoryTotals = new Map<string, number>();
  for (const risk of allMapped) {
    if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
    const raw = typeof risk.category === "string" ? risk.category.trim() : "";
    const cat = raw.length > 0 ? raw : "Uncategorized";
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + 1);
  }
  return [...categoryTotals.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function projectOverviewRiskOwnerCounts(allMapped: Risk[]): PortfolioRiskOwnerCount[] {
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

/** Same row affordances as clickable rows in {@link DocumentKpiModal} portfolio KPI tables. */
const PROJECT_OVERVIEW_KPI_TABLE_ROW_INTERACTIVE =
  "cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]";

type ProjectOverviewKpiDrilldownRow = {
  riskId: string;
  name: string;
  metricDisplay: string;
  /** Shown between name and metric when {@link ProjectOverviewKpiDrilldownTable} `tertiaryColumnHeader` is set. */
  tertiaryDisplay?: string;
};

type ExecutiveDriverPreviewRow = {
  key: string;
  heading: string;
  valueDisplay: string;
};

function ExecutiveDriverCardPreview({ rows }: { rows: ExecutiveDriverPreviewRow[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex min-w-0 items-start justify-between gap-3">
          <span className="line-clamp-2 min-w-0 flex-1 text-left font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-primary)]">
            {row.heading}
          </span>
          <span className="shrink-0 text-right text-[length:var(--ds-text-xs)] font-normal tabular-nums text-[var(--ds-text-primary)]">
            {row.valueDisplay}
          </span>
        </div>
      ))}
    </div>
  );
}

function ExecutiveDriverCardFallback({ name, valueDisplay }: { name: string; valueDisplay: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="line-clamp-3 min-w-0 flex-1 text-left font-normal text-[length:var(--ds-text-xs)] text-[var(--ds-text-primary)]">
        {name}
      </span>
      <span className="shrink-0 text-right text-[length:var(--ds-text-xs)] font-normal tabular-nums text-[var(--ds-text-primary)]">
        {valueDisplay}
      </span>
    </div>
  );
}

function ProjectOverviewKpiDrilldownTable({
  projectId,
  caption,
  nameColumnHeader,
  metricColumnHeader,
  tertiaryColumnHeader,
  rows,
  isRowNavigable,
  nonNavigableAriaLabel,
  initialVisibleRows,
  expandRowsBy = 5,
}: {
  projectId: string;
  caption: string;
  nameColumnHeader: string;
  metricColumnHeader: string;
  /** When set, an extra column is shown between the name and metric columns (e.g. cost of mitigation before reduction). */
  tertiaryColumnHeader?: string;
  rows: ProjectOverviewKpiDrilldownRow[];
  /** Per-row: default all rows open risk detail. */
  isRowNavigable?: (row: ProjectOverviewKpiDrilldownRow) => boolean;
  /** When a row is not navigable, describe why (e.g. synthetic driver). */
  nonNavigableAriaLabel?: (row: ProjectOverviewKpiDrilldownRow) => string | undefined;
  /** When set, show only this many rows until the user expands (see {@link expandRowsBy}). */
  initialVisibleRows?: number;
  /** Rows to reveal per “Show more” click (default 5). */
  expandRowsBy?: number;
}) {
  const showTertiary = tertiaryColumnHeader != null && tertiaryColumnHeader.trim() !== "";
  const router = useRouter();

  const fullCount = rows.length;
  const cappedInitial =
    initialVisibleRows != null ? Math.min(initialVisibleRows, fullCount) : fullCount;
  const [visibleCount, setVisibleCount] = useState(cappedInitial);

  useEffect(() => {
    setVisibleCount(initialVisibleRows != null ? Math.min(initialVisibleRows, rows.length) : rows.length);
  }, [initialVisibleRows, rows]);

  const visibleRows = initialVisibleRows != null ? rows.slice(0, visibleCount) : rows;
  const remaining = fullCount - visibleCount;
  const nextReveal = Math.min(expandRowsBy, remaining);
  const showMoreLabel =
    remaining > 0
      ? nextReveal === expandRowsBy && expandRowsBy === 5
        ? "Show 5 more"
        : `Show ${nextReveal} more`
      : null;

  const canShowLess =
    initialVisibleRows != null && visibleCount > initialVisibleRows && fullCount > initialVisibleRows;

  const goToRiskDetail = useCallback(
    (riskId: string) => {
      const pid = projectId.trim();
      if (!pid) return;
      const q = new URLSearchParams({ openRiskId: riskId });
      router.push(riskaiPath(`/projects/${pid}/risks?${q.toString()}`));
    },
    [projectId, router]
  );

  return (
    <Card className="w-full min-w-0 overflow-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className={`${KPI_MODAL_REGISTER_TABLE_CLASS} w-full`}>
        <caption className="sr-only">{caption}</caption>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-12 !text-right align-middle tabular-nums">#</TableHeaderCell>
            <TableHeaderCell className="min-w-0 align-middle">{nameColumnHeader}</TableHeaderCell>
            {showTertiary ? (
              <TableHeaderCell className="!text-right align-middle">{tertiaryColumnHeader}</TableHeaderCell>
            ) : null}
            <TableHeaderCell className="!text-right align-middle">{metricColumnHeader}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row, i) => {
            const navigable = isRowNavigable ? isRowNavigable(row) : true;
            const inertLabel = nonNavigableAriaLabel?.(row);
            return (
              <TableRow
                key={row.riskId}
                className={navigable ? PROJECT_OVERVIEW_KPI_TABLE_ROW_INTERACTIVE : undefined}
                tabIndex={navigable ? 0 : undefined}
                role={navigable ? "button" : undefined}
                aria-label={
                  navigable
                    ? `Open risk details for ${row.name}`
                    : inertLabel ?? "Not linked to a register risk"
                }
                onClick={navigable ? () => goToRiskDetail(row.riskId) : undefined}
                onKeyDown={
                  navigable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToRiskDetail(row.riskId);
                        }
                      }
                    : undefined
                }
              >
                <TableCell className="w-12 text-right tabular-nums align-middle text-[var(--ds-text-muted)]">
                  {i + 1}
                </TableCell>
                <TableCell className="min-w-0 max-w-[28rem] align-middle">
                  <span
                    className="block min-w-0 truncate font-medium text-[var(--ds-text-primary)]"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                </TableCell>
                {showTertiary ? (
                  <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-secondary)]">
                    {row.tertiaryDisplay ?? "—"}
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-secondary)]">
                  {row.metricDisplay}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {showMoreLabel != null || canShowLess ? (
        <div className="flex flex-wrap justify-start gap-2 border-t border-[var(--ds-border-subtle)] px-4 py-3">
          {showMoreLabel != null ? (
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setVisibleCount((v) => Math.min(v + expandRowsBy, fullCount));
              }}
            >
              {showMoreLabel}
            </Button>
          ) : null}
          {canShowLess ? (
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setVisibleCount(initialVisibleRows!);
              }}
            >
              Show less
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function ProjectOverviewContent({ initialData }: ProjectOverviewContentProps) {
  const { projectId, reportingSnapshot, initialUrlSearch, unpublishedMode, lockedReportingBaselineSnapshot } =
    initialData ?? {
      projectId: "",
      reportingSnapshot: null,
      lockedReportingBaselineSnapshot: null,
      unpublishedMode: false,
      initialUrlSearch: "",
    };

  /** Locked row used for reporting-position bands and monthly-lock staleness; primary row in normal mode. */
  const staleAndPositionLockedRow = unpublishedMode ? lockedReportingBaselineSnapshot : reportingSnapshot;

  /** Row for `reportingRun*` counts and overview charts: selected run, or locked baseline when unpublished has no newer unlocked snapshot. */
  const reportingRunRiskCountSnapshotRow = reportingSnapshot ?? staleAndPositionLockedRow;

  const { setRisks } = useRiskRegister();
  const { setExtras } = usePageHeaderExtras();
  const [risks, setRisksLocal] = useState<Risk[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(true);
  const [projectSettingsResolved, setProjectSettingsResolved] = useState<ProjectContext | null>(null);
  /** Raw `visualify_project_settings` row — used with the locked snapshot for the same reporting table as portfolio RAG modal. */
  const [visualifyProjectSettingsRow, setVisualifyProjectSettingsRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [projectSettingsReady, setProjectSettingsReady] = useState(false);
  /** Linked “Show All” for Category + Owner (portfolio overview pattern). */
  const [categoryOwnerBreakdownOpen, setCategoryOwnerBreakdownOpen] = useState(false);
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [overviewModalIndex, setOverviewModalIndex] = useState(0);
  const toggleCategoryOwnerBreakdown = useCallback(() => {
    setCategoryOwnerBreakdownOpen((o) => !o);
  }, []);

  useEffect(() => {
    const pid = projectId?.trim();
    if (!pid) {
      console.error("[ProjectOverview] listRisks skipped: projectId is required for risk access");
      setLoadingRisks(false);
      return;
    }
    setLoadingRisks(true);
    listRisks(pid)
      .then((loaded) => {
        setRisks(loaded);
        setRisksLocal(loaded);
      })
      .catch((err) => console.error("[ProjectOverview] load risks", err))
      .finally(() => setLoadingRisks(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const pid = projectId?.trim();
    if (!pid) {
      setProjectSettingsResolved(null);
      setVisualifyProjectSettingsRow(null);
      setProjectSettingsReady(false);
      return;
    }
    let cancelled = false;
    setProjectSettingsReady(false);
    void (async () => {
      const supabase = supabaseBrowserClient();
      const { data: row, error } = await supabase
        .from("visualify_project_settings")
        .select("*")
        .eq("project_id", pid)
        .maybeSingle();
      if (cancelled) return;
      let next: ProjectContext | null = null;
      if (!error && row && typeof row === "object") {
        setVisualifyProjectSettingsRow(row as Record<string, unknown>);
        const parsed = parseProjectContextFromVisualifyProjectSettingsRow(row as Record<string, unknown>);
        if (parsed) next = parsed;
      } else {
        setVisualifyProjectSettingsRow(null);
      }
      if (next == null) {
        next = loadProjectContext(pid);
      }
      if (!cancelled) {
        setProjectSettingsResolved(next);
        setProjectSettingsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const builtFromReporting = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow) return null;
    return buildSimulationFromDbRow(reportingRunRiskCountSnapshotRow);
  }, [reportingRunRiskCountSnapshotRow]);

  const projectContext = useMemo(() => {
    const pid = projectId?.trim();
    if (!pid) return null;
    if (!projectSettingsReady) return loadProjectContext(pid);
    return projectSettingsResolved;
  }, [projectId, projectSettingsReady, projectSettingsResolved]);

  /** Single-row payload for the portfolio-style reporting-position table in the KPI modal. */
  const projectTilePayloadsForRagModal = useMemo(() => {
    const pid = projectId?.trim();
    if (!pid || !staleAndPositionLockedRow) return undefined;
    const riskCount = reportingRunActiveRiskCount(reportingRunRiskCountSnapshotRow);
    const highSeverityCount = reportingRunHighExtremeCount(reportingRunRiskCountSnapshotRow, risks);
    const name =
      projectContext?.projectName?.trim() && projectContext.projectName.trim().length > 0
        ? projectContext.projectName.trim()
        : pid;
    const payload = buildProjectTilePayloadForReportingModal({
      project: { id: pid, name, created_at: null },
      lockedRow: staleAndPositionLockedRow,
      settingsRow: visualifyProjectSettingsRow,
      riskCount,
      highSeverityCount,
    });
    return [payload];
  }, [
    projectId,
    reportingRunRiskCountSnapshotRow,
    staleAndPositionLockedRow,
    visualifyProjectSettingsRow,
    risks,
    projectContext?.projectName,
  ]);

  /** Cost/time line severities — same as simulation reporting position (not mean−at‑P dollar gap). */
  const reportingPositionBreakdown = useMemo(() => {
    if (!staleAndPositionLockedRow || visualifyProjectSettingsRow == null) return null;
    return tryReportingBreakdownFromLockedRowAndSettings(
      staleAndPositionLockedRow,
      visualifyProjectSettingsRow
    );
  }, [staleAndPositionLockedRow, visualifyProjectSettingsRow]);

  const targetAppetite: RiskAppetite = projectContext?.riskAppetite ?? "P80";
  const targetPercent = riskAppetiteToPercent(targetAppetite);

  const contingencyDollars: number | null =
    projectContext?.contingencyValue_m != null && Number.isFinite(projectContext.contingencyValue_m)
      ? projectContext.contingencyValue_m * 1e6
      : null;

  const scheduleContingencyDays: number | null =
    projectContext?.scheduleContingency_weeks != null &&
    Number.isFinite(projectContext.scheduleContingency_weeks)
      ? projectContext.scheduleContingency_weeks * 7
      : null;

  /** Same days scale as simulation schedule reference for time-CDF percentile. */
  const plannedDurationDays: number | null =
    projectContext?.plannedDuration_months != null &&
    Number.isFinite(projectContext.plannedDuration_months) &&
    projectContext.plannedDuration_months > 0
      ? (projectContext.plannedDuration_months * 365) / 12
      : null;

  /** Cost axis value for “current P” marker — contingency else approved budget (same as funding-confidence P). */
  const costFundingReferenceDollars = useMemo((): number | null => {
    if (contingencyDollars != null && Number.isFinite(contingencyDollars)) return contingencyDollars;
    if (projectContext != null && Number.isFinite(projectContext.approvedBudget_m)) {
      return projectContext.approvedBudget_m * 1e6;
    }
    return null;
  }, [contingencyDollars, projectContext?.approvedBudget_m]);

  /** Time axis value for “current P” marker — schedule contingency else planned duration. */
  const scheduleReferenceDaysForChart = useMemo((): number | null => {
    if (scheduleContingencyDays != null && Number.isFinite(scheduleContingencyDays) && scheduleContingencyDays > 0) {
      return scheduleContingencyDays;
    }
    return plannedDurationDays;
  }, [scheduleContingencyDays, plannedDurationDays]);

  const current = builtFromReporting?.current;

  const reportingRunRiskIdSet = useMemo(
    () => reportingRunRiskIdsFromSnapshot(current, reportingRunRiskCountSnapshotRow),
    [current, reportingRunRiskCountSnapshotRow]
  );

  const reportingRunRisks = useMemo(() => {
    if (reportingRunRiskIdSet.size === 0) return risks;
    return risks.filter((r) => reportingRunRiskIdSet.has(r.id));
  }, [risks, reportingRunRiskIdSet]);

  const projectRiskStatusCounts = useMemo(
    () => projectOverviewRiskStatusCounts(reportingRunRisks),
    [reportingRunRisks]
  );

  const projectSeveritySummaryRows: PortfolioProjectRiskSeverityRow[] = useMemo(() => {
    const row: PortfolioProjectRiskSeverityRow = {
      projectId: projectId?.trim() ?? "",
      projectName: "",
      low: 0,
      medium: 0,
      high: 0,
      extreme: 0,
    };
    for (const risk of reportingRunRisks) {
      if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
      const lv = getCurrentRiskRatingLevel(risk);
      if (lv == null) continue;
      if (lv === "low") row.low += 1;
      else if (lv === "medium") row.medium += 1;
      else if (lv === "high") row.high += 1;
      else row.extreme += 1;
    }
    return [row];
  }, [projectId, reportingRunRisks]);

  const projectRiskCategoryCounts = useMemo(
    () => projectOverviewRiskCategoryCounts(reportingRunRisks),
    [reportingRunRisks]
  );

  const projectRiskOwnerCounts = useMemo(
    () => projectOverviewRiskOwnerCounts(reportingRunRisks),
    [reportingRunRisks]
  );

  const neutralExposure = useMemo(
    () => (risks.length > 0 ? computeNeutralForwardExposure(risks) : null),
    [risks]
  );

  const costDrivers = useMemo(() => {
    if (!neutralExposure) return [];
    const base = buildCostDriverLines(current, risks, neutralExposure);
    return rankCostDriverLinesWithDelayCommercial({
      baseLines: base,
      neutralExposure,
      neutral: builtFromReporting?.neutral ?? null,
    });
  }, [current, risks, neutralExposure, builtFromReporting?.neutral]);

  const scheduleDrivers = useMemo(() => buildScheduleDriverLines(current, risks), [current, risks]);

  const keyCostRisk =
    costDrivers[0]?.riskName ?? topCostRiskTitleFromSnapshotPayload(reportingRunRiskCountSnapshotRow);
  const keyTimeRisk =
    scheduleDrivers[0]?.riskName ?? topTimeRiskTitleFromSnapshotPayload(reportingRunRiskCountSnapshotRow);

  const keyOpportunityInfo = useMemo(() => {
    const best = [...costDrivers].filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta)[0];
    return best ? { name: best.riskName, delta: best.delta } : null;
  }, [costDrivers]);

  const keyCostRiskImpact = useMemo(() => {
    const first = costDrivers[0];
    if (!first) return null;
    return costDriverExposureUsd(first, neutralExposure, builtFromReporting?.neutral);
  }, [costDrivers, neutralExposure, builtFromReporting?.neutral]);

  const topThreeKeyCostDrivers = useMemo(
    () =>
      costDrivers.slice(0, 3).map((line) => ({
        ...line,
        exposureUsd: costDriverExposureUsd(line, neutralExposure, builtFromReporting?.neutral),
      })),
    [costDrivers, neutralExposure, builtFromReporting?.neutral]
  );

  const topThreeScheduleDriverRows = useMemo((): ProjectOverviewKpiDrilldownRow[] => {
    return scheduleDrivers.slice(0, 3).map((line) => ({
      riskId: line.riskId,
      name: line.riskName,
      metricDisplay: line.totalDays > 0 ? `${formatDurationDays(line.totalDays)} mean` : "—",
    }));
  }, [scheduleDrivers]);

  const topThreeOpportunityRows = useMemo((): ProjectOverviewKpiDrilldownRow[] => {
    return [...costDrivers]
      .filter((d) => d.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3)
      .map((line) => ({
        riskId: line.riskId,
        name: line.riskName,
        metricDisplay: `${formatCurrency(line.delta)} mitigation reduction`,
      }));
  }, [costDrivers]);

  const topTenCostDriverModalRows = useMemo((): ProjectOverviewKpiDrilldownRow[] => {
    return costDrivers.slice(0, EXEC_DRIVER_MODAL_ROW_CAP).map((line) => {
      const exposureUsd = costDriverExposureUsd(line, neutralExposure, builtFromReporting?.neutral);
      return {
        riskId: line.riskId,
        name: line.riskName,
        metricDisplay: exposureUsd != null ? formatCurrency(exposureUsd) + " exposure" : "—",
      };
    });
  }, [costDrivers, neutralExposure, builtFromReporting?.neutral]);

  const topTenScheduleDriverModalRows = useMemo((): ProjectOverviewKpiDrilldownRow[] => {
    return scheduleDrivers.slice(0, EXEC_DRIVER_MODAL_ROW_CAP).map((line) => ({
      riskId: line.riskId,
      name: line.riskName,
      metricDisplay: line.totalDays > 0 ? `${formatDurationDays(line.totalDays)} mean` : "—",
    }));
  }, [scheduleDrivers]);

  const topTenOpportunityModalRows = useMemo((): ProjectOverviewKpiDrilldownRow[] => {
    return [...costDrivers]
      .filter((d) => d.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, EXEC_DRIVER_MODAL_ROW_CAP)
      .map((line) => {
        const risk = risks.find((r) => r.id === line.riskId);
        const mitigationCostDisplay =
          risk != null &&
          typeof risk.mitigationCost === "number" &&
          Number.isFinite(risk.mitigationCost) &&
          risk.mitigationCost >= 0
            ? formatCurrency(risk.mitigationCost)
            : "—";
        return {
          riskId: line.riskId,
          name: line.riskName,
          metricDisplay: `${formatCurrency(line.delta)} mitigation reduction`,
          tertiaryDisplay: mitigationCostDisplay,
        };
      });
  }, [costDrivers, risks]);

  const keyTimeRiskDays = scheduleDrivers[0]?.totalDays ?? null;

  const snapshotPayloadBuffer = useMemo(
    () =>
      reportingRunRiskCountSnapshotRow
        ? optionalBufferFromSnapshotPayload(reportingRunRiskCountSnapshotRow)
        : null,
    [reportingRunRiskCountSnapshotRow]
  );

  const costAtAppetiteLine = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow) return null;
    return interpolateModeledTotalCostAtRiskPercentile(
      reportingRunRiskCountSnapshotRow,
      builtFromReporting?.neutral ?? null,
      targetPercent
    );
  }, [reportingRunRiskCountSnapshotRow, builtFromReporting?.neutral, targetPercent]);

  const timeAtAppetiteLine = useMemo(
    () =>
      reportingRunRiskCountSnapshotRow
        ? interpolateSnapshotAtRiskPercentile(reportingRunRiskCountSnapshotRow, targetPercent, "time")
        : null,
    [reportingRunRiskCountSnapshotRow, targetPercent]
  );

  const meanCostFromSnapshot = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow) return null;
    return modeledTotalCostMeanDollars(
      reportingRunRiskCountSnapshotRow,
      builtFromReporting?.neutral ?? null
    );
  }, [reportingRunRiskCountSnapshotRow, builtFromReporting?.neutral]);

  const meanTimeFromSnapshot = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow) return null;
    const m = Number(reportingRunRiskCountSnapshotRow.time_mean);
    return Number.isFinite(m) ? m : null;
  }, [reportingRunRiskCountSnapshotRow]);

  const dollarGapLabel = useMemo(
    () => formatSignedDollarGap(meanCostFromSnapshot, costAtAppetiteLine),
    [meanCostFromSnapshot, costAtAppetiteLine]
  );

  const timeGapWeeksLabel = useMemo(
    () => formatSignedTimeGapWeeks(meanTimeFromSnapshot, timeAtAppetiteLine),
    [meanTimeFromSnapshot, timeAtAppetiteLine]
  );

  const dollarGapSigned =
    meanCostFromSnapshot != null && costAtAppetiteLine != null
      ? meanCostFromSnapshot - costAtAppetiteLine
      : null;

  const timeGapSigned =
    meanTimeFromSnapshot != null && timeAtAppetiteLine != null
      ? meanTimeFromSnapshot - timeAtAppetiteLine
      : null;

  /** Same P as simulation “Current Funding Confidence” (cost CDF at contingency else approved budget). */
  const currentConfidenceLabel = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow) return null;
    const approvedBudgetDollars =
      projectContext != null && Number.isFinite(projectContext.approvedBudget_m)
        ? projectContext.approvedBudget_m * 1e6
        : null;
    return currentFundingConfidenceLabelFromNeutral({
      neutral: builtFromReporting?.neutral ?? null,
      contingencyDollars,
      approvedBudgetDollars,
    });
  }, [reportingRunRiskCountSnapshotRow, builtFromReporting, contingencyDollars, projectContext?.approvedBudget_m]);

  /** Current funding P v appetite (target P from reporting). */
  const costGapTileSubtext = useMemo(() => {
    const cur = currentConfidenceLabel?.trim();
    if (cur != null && cur !== "") {
      return `At ${cur} v ${targetAppetite} Target`;
    }
    return `Mean v ${targetAppetite} Target`;
  }, [currentConfidenceLabel, targetAppetite]);

  /** Same P as simulation schedule position (contingency / planned duration on the time CDF). */
  const currentScheduleConfidenceLabel = useMemo(
    () =>
      currentScheduleConfidenceLabelFromNeutral({
        neutral: builtFromReporting?.neutral ?? null,
        scheduleContingencyDays,
        plannedDurationDays,
      }),
    [builtFromReporting?.neutral, scheduleContingencyDays, plannedDurationDays]
  );

  const timeGapTileSubtext = useMemo(() => {
    const cur = currentScheduleConfidenceLabel?.trim();
    if (cur != null && cur !== "") {
      return `At ${cur} v ${targetAppetite} Target`;
    }
    return `Schedule mean v ${targetAppetite} Target`;
  }, [currentScheduleConfidenceLabel, targetAppetite]);

  const neutralFromReporting = builtFromReporting?.neutral ?? null;

  const costExposureBarData = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow || !neutralFromReporting) return [];
    return toBarDataCost(
      costHistogramFromReporting(reportingRunRiskCountSnapshotRow, neutralFromReporting)
    );
  }, [reportingRunRiskCountSnapshotRow, neutralFromReporting]);

  const scheduleExposureBarData = useMemo(() => {
    if (!reportingRunRiskCountSnapshotRow || !neutralFromReporting) return [];
    return toBarDataTime(
      timeHistogramFromReporting(reportingRunRiskCountSnapshotRow, neutralFromReporting)
    );
  }, [reportingRunRiskCountSnapshotRow, neutralFromReporting]);

  const bufferCostNumeric =
    snapshotPayloadBuffer?.costDollars != null
      ? snapshotPayloadBuffer.costDollars
      : contingencyDollars != null
        ? contingencyDollars
        : null;

  const bufferTimeNumeric =
    snapshotPayloadBuffer?.timeDays != null
      ? snapshotPayloadBuffer.timeDays
      : scheduleContingencyDays != null
        ? scheduleContingencyDays
        : null;

  const bufferCostDisplay =
    bufferCostNumeric != null ? formatCurrency(bufferCostNumeric) : "—";

  const bufferTimeDisplay =
    bufferTimeNumeric != null ? formatDurationDays(bufferTimeNumeric) : "—";

  const costExposureContingencySubline =
    bufferCostNumeric != null && Number.isFinite(bufferCostNumeric)
      ? `${bufferCostDisplay} contingency`
      : null;

  const scheduleExposureContingencySubline =
    bufferTimeNumeric != null && Number.isFinite(bufferTimeNumeric)
      ? `${bufferTimeDisplay} contingency`
      : null;

  const ragStatus = useMemo(() => {
    const lastAt =
      staleAndPositionLockedRow?.locked_at ?? staleAndPositionLockedRow?.created_at ?? null;
    const base = computeRag({
      riskCount: reportingRunActiveRiskCount(reportingRunRiskCountSnapshotRow),
      highSeverityCount: reportingRunHighExtremeCount(reportingRunRiskCountSnapshotRow, risks),
      lastLockedReportingAt: lastAt,
    });
    return applyStaleReportingLockRag(base, staleAndPositionLockedRow ?? undefined, Date.now());
  }, [reportingRunRiskCountSnapshotRow, staleAndPositionLockedRow, risks]);

  const effectiveRagForHealth = useMemo((): RagStatus => {
    if (ragStatus === "green" && ((dollarGapSigned ?? 0) > 0 || (timeGapSigned ?? 0) > 0)) {
      return "amber";
    }
    return ragStatus;
  }, [ragStatus, dollarGapSigned, timeGapSigned]);

  const hasGapComparison = useMemo(
    () =>
      meanCostFromSnapshot != null &&
      costAtAppetiteLine != null &&
      meanTimeFromSnapshot != null &&
      timeAtAppetiteLine != null,
    [meanCostFromSnapshot, costAtAppetiteLine, meanTimeFromSnapshot, timeAtAppetiteLine]
  );

  const projectHealthSubtext = useMemo(() => {
    if (!hasGapComparison) return "Reporting snapshot";
    if ((dollarGapSigned ?? 0) > 0 || (timeGapSigned ?? 0) > 0) return "Above target P";
    return "Within target P";
  }, [hasGapComparison, dollarGapSigned, timeGapSigned]);

  const healthTile = useMemo(
    () => projectRiskRatingTileCopy(effectiveRagForHealth),
    [effectiveRagForHealth]
  );

  const projectNeedsAttentionHealthRun = useMemo((): PortfolioNeedsAttentionHealthRun => {
    if (!reportingRunRiskCountSnapshotRow) {
      return {
        healthScore: 100,
        primaryRagDot: "green",
        projectsWithActiveRisksCount: 0,
        staleSimulationProjectCount: 0,
        topDriverPoolSize: 0,
        topDriversWithoutMitigationCount: 0,
        materialOpportunityProjectCount: 0,
        registerGapCount: 0,
      };
    }

    let registerGapCount = 0;
    for (const risk of reportingRunRisks) {
      if (!isRiskActiveForPortfolioAnalytics(risk)) continue;
      const level = getCurrentRiskRatingLevel(risk);
      if (level !== "high" && level !== "extreme") continue;
      if (risk.mitigation?.trim() && risk.owner?.trim()) continue;
      registerGapCount += 1;
    }

    const costTopIds = costDrivers.slice(0, 5).map((d) => d.riskId);
    const schedTopIds = scheduleDrivers.slice(0, 5).map((d) => d.riskId);
    const topPoolIds = [...new Set([...costTopIds, ...schedTopIds])];
    const riskById = new Map(risks.map((r) => [r.id, r] as const));
    let topDriversWithoutMitigationCount = 0;
    for (const id of topPoolIds) {
      const rk = riskById.get(id);
      if (rk != null && !rk.mitigation?.trim()) topDriversWithoutMitigationCount += 1;
    }
    const topDriverPoolSize = new Set(topPoolIds).size;

    let materialOpportunityProjectCount: 0 | 1 = 0;
    for (const r of reportingRunRisks) {
      const c = monitoringCostOpportunityExpected(r);
      const s = monitoringScheduleOpportunityExpected(r);
      if ((c != null && c > 0) || (s != null && s > 0)) {
        materialOpportunityProjectCount = 1;
        break;
      }
    }

    const analyticsActive = reportingRunRisks.filter(isRiskActiveForPortfolioAnalytics).length;
    const projectsWithActiveRisksCount = analyticsActive > 0 ? 1 : 0;
    const lockAt =
      staleAndPositionLockedRow?.locked_at ?? staleAndPositionLockedRow?.created_at ?? null;
    const staleSimulationProjectCount =
      projectsWithActiveRisksCount > 0 && reportingLockStaleForPortfolio(lockAt, Date.now()) ? 1 : 0;

    const { healthScore, primaryRagDot } = computeNeedsAttentionHealthRun({
      staleSimulationProjectCount,
      registerGapCount,
      topDriversWithoutMitigationCount,
    });

    return {
      healthScore,
      primaryRagDot,
      projectsWithActiveRisksCount,
      staleSimulationProjectCount,
      topDriverPoolSize,
      topDriversWithoutMitigationCount,
      materialOpportunityProjectCount,
      registerGapCount,
    };
  }, [
    reportingRunRiskCountSnapshotRow,
    staleAndPositionLockedRow,
    reportingRunRisks,
    costDrivers,
    scheduleDrivers,
    risks,
  ]);

  const projectHealthKpiTile = useMemo((): DocumentKpiTileItem => {
    return {
      title: PROJECT_HEALTH_KPI_TITLE,
      primaryValue: healthTile.primary,
      primaryValueClassName: healthTile.primaryValueClassName,
      primaryRagDot: healthTile.primaryRagDot,
      subtext: projectHealthSubtext,
    };
  }, [healthTile, projectHealthSubtext]);

  /** Mean minus appetite line: ≤0 (at/under target) reads favorable. */
  const gapValueClass = (meanMinusAppetite: number | null) => {
    if (meanMinusAppetite == null || !Number.isFinite(meanMinusAppetite)) {
      return "text-[var(--ds-text-primary)]";
    }
    if (meanMinusAppetite <= 0) return "text-[var(--ds-status-success-fg)]";
    return "text-[var(--ds-status-danger-fg)]";
  };

  const costGapPrimaryClass = useMemo(() => {
    const line = reportingPositionBreakdown?.costLine;
    if (line != null) return reportingLineSeverityToValueClass(line);
    return gapValueClass(dollarGapSigned);
  }, [reportingPositionBreakdown, dollarGapSigned]);

  const timeGapPrimaryClass = useMemo(() => {
    const line = reportingPositionBreakdown?.timeLine;
    if (line != null) return reportingLineSeverityToValueClass(line);
    return gapValueClass(timeGapSigned);
  }, [reportingPositionBreakdown, timeGapSigned]);

  const costGapPrimaryRag = useMemo(
    () => reportingLineSeverityToRag(reportingPositionBreakdown?.costLine),
    [reportingPositionBreakdown]
  );

  const timeGapPrimaryRag = useMemo(
    () => reportingLineSeverityToRag(reportingPositionBreakdown?.timeLine),
    [reportingPositionBreakdown]
  );

  const costExposureCurrentPLineStroke = useMemo(
    () => exposureHistogramCurrentPGapStroke(reportingPositionBreakdown?.costLine, dollarGapSigned),
    [reportingPositionBreakdown, dollarGapSigned]
  );

  const scheduleExposureCurrentPLineStroke = useMemo(
    () => exposureHistogramCurrentPGapStroke(reportingPositionBreakdown?.timeLine, timeGapSigned),
    [reportingPositionBreakdown, timeGapSigned]
  );

  const projectKpiTiles = useMemo((): DocumentKpiTileItem[] => {
    if (!reportingRunRiskCountSnapshotRow) return [];
    const rr = projectRiskRatingTileCopy(ragStatus);
    const activeN = reportingRunActiveRiskCount(reportingRunRiskCountSnapshotRow);
    const highN = reportingRunHighExtremeCount(reportingRunRiskCountSnapshotRow, risks);
    const riskRatingSubtext = `${activeN} risk${activeN === 1 ? "" : "s"} in reporting run${
      highN > 0 ? ` · ${highN} high / extreme` : ""
    }`;
    return [
      {
        title: PROJECT_RISK_RATING_KPI_TITLE,
        primaryValue: rr.primary,
        primaryValueClassName: rr.primaryValueClassName,
        primaryRagDot: rr.primaryRagDot,
        subtext: riskRatingSubtext,
      },
      projectHealthKpiTile,
      {
        title: "Cost Gap to Target",
        primaryValue: dollarGapLabel,
        primaryValueClassName: costGapPrimaryClass,
        primaryRagDot: costGapPrimaryRag,
        subtext: costGapTileSubtext,
      },
      {
        title: "Time Gap to Target",
        primaryValue: timeGapWeeksLabel,
        primaryValueClassName: timeGapPrimaryClass,
        primaryRagDot: timeGapPrimaryRag,
        subtext: timeGapTileSubtext,
      },
    ];
  }, [
    reportingRunRiskCountSnapshotRow,
    ragStatus,
    risks,
    projectHealthKpiTile,
    dollarGapLabel,
    dollarGapSigned,
    costGapTileSubtext,
    timeGapTileSubtext,
    timeGapWeeksLabel,
    costGapPrimaryClass,
    costGapPrimaryRag,
    timeGapPrimaryClass,
    timeGapPrimaryRag,
  ]);

  const overviewTiles = useMemo(
    () => [...projectKpiTiles, ...PROJECT_OVERVIEW_MODAL_EXTRA_TILES],
    [projectKpiTiles]
  );

  const openOverviewAt = useCallback((index: number) => {
    setOverviewModalIndex(index);
    setOverviewModalOpen(true);
  }, []);

  const renderProjectOverviewSlideBody = useCallback(
    (slideIndex: number) => {
      if (!reportingRunRiskCountSnapshotRow || slideIndex < 4) return null;
      switch (slideIndex) {
        case 4:
          return (
            <ProjectExposureHistogramCard
              title="Cost Exposure"
              data={costExposureBarData}
              targetX={costAtAppetiteLine}
              currentPLineStroke={costExposureCurrentPLineStroke}
              pValueX={costFundingReferenceDollars}
              pValueLabel={currentConfidenceLabel}
              formatX={formatCurrency}
              targetLabel={targetAppetite}
              supportingSubline={costExposureContingencySubline}
              embedded
            />
          );
        case 5:
          return (
            <ProjectExposureHistogramCard
              title="Schedule Exposure"
              data={scheduleExposureBarData}
              targetX={timeAtAppetiteLine}
              currentPLineStroke={scheduleExposureCurrentPLineStroke}
              pValueX={scheduleReferenceDaysForChart}
              pValueLabel={currentScheduleConfidenceLabel}
              formatX={formatDurationDays}
              targetLabel={targetAppetite}
              supportingSubline={scheduleExposureContingencySubline}
              embedded
            />
          );
        case 6:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : topTenCostDriverModalRows.length === 0 ? (
            <p className="ds-kpi-modal-empty">No cost drivers in this reporting run.</p>
          ) : (
            <ProjectOverviewKpiDrilldownTable
              projectId={projectId}
              caption="Cost drivers ranked by modeled dollar exposure"
              nameColumnHeader="Cost driver"
              metricColumnHeader="Modeled exposure"
              rows={topTenCostDriverModalRows}
              initialVisibleRows={EXEC_DRIVER_MODAL_INITIAL_ROWS}
              expandRowsBy={5}
              isRowNavigable={(row) => !isSimulationDelayCommercialCostDriverRiskId(row.riskId)}
              nonNavigableAriaLabel={(row) =>
                isSimulationDelayCommercialCostDriverRiskId(row.riskId)
                  ? "Delay-related commercial impact — derived from schedule, not a register risk"
                  : undefined
              }
            />
          );
        case 7:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : topTenScheduleDriverModalRows.length === 0 ? (
            <p className="ds-kpi-modal-empty">No schedule drivers in this reporting run.</p>
          ) : (
            <ProjectOverviewKpiDrilldownTable
              projectId={projectId}
              caption="Schedule drivers ranked by modeled mean delay"
              nameColumnHeader="Schedule driver"
              metricColumnHeader="Modeled time"
              rows={topTenScheduleDriverModalRows}
              initialVisibleRows={EXEC_DRIVER_MODAL_INITIAL_ROWS}
              expandRowsBy={5}
            />
          );
        case 8:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : topTenOpportunityModalRows.length === 0 ? (
            <p className="ds-kpi-modal-empty">No mitigation opportunities in this reporting run.</p>
          ) : (
            <ProjectOverviewKpiDrilldownTable
              projectId={projectId}
              caption="Mitigation opportunities by expected dollar reduction"
              nameColumnHeader="Risk"
              metricColumnHeader="Mitigation reduction"
              tertiaryColumnHeader="Cost of mitigation"
              rows={topTenOpportunityModalRows}
              initialVisibleRows={EXEC_DRIVER_MODAL_INITIAL_ROWS}
              expandRowsBy={5}
            />
          );
        case 9:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <PortfolioRiskStatusCountsTable rows={projectRiskStatusCounts} />
          );
        case 10:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <PortfolioRiskSeverityCountsTable activeRiskSummaryRows={projectSeveritySummaryRows} />
          );
        case 11:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <PortfolioRiskCategoryCountsTable
              rows={projectRiskCategoryCounts}
              breakdownOpen={categoryOwnerBreakdownOpen}
              showAllRows
            />
          );
        case 12:
          return loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <PortfolioRiskOwnerCountsTable
              rows={projectRiskOwnerCounts}
              breakdownOpen={categoryOwnerBreakdownOpen}
              showAllRows
            />
          );
        default:
          return null;
      }
    },
    [
      reportingRunRiskCountSnapshotRow,
      projectId,
      costExposureBarData,
      costAtAppetiteLine,
      costExposureCurrentPLineStroke,
      costFundingReferenceDollars,
      currentConfidenceLabel,
      costExposureContingencySubline,
      scheduleExposureBarData,
      timeAtAppetiteLine,
      scheduleExposureCurrentPLineStroke,
      scheduleReferenceDaysForChart,
      currentScheduleConfidenceLabel,
      scheduleExposureContingencySubline,
      targetAppetite,
      loadingRisks,
      topTenCostDriverModalRows,
      topTenScheduleDriverModalRows,
      topTenOpportunityModalRows,
      projectRiskStatusCounts,
      projectSeveritySummaryRows,
      projectRiskCategoryCounts,
      projectRiskOwnerCounts,
      categoryOwnerBreakdownOpen,
    ]
  );

  /** RAG subline can use snapshot `inputs_used` without waiting for the risk register. */
  const projectStatusStatsNeedRegister =
    !reportingRunRiskCountSnapshotRow?.payload?.inputs_used?.length;
  const showProjectStatusSkeleton = loadingRisks && projectStatusStatsNeedRegister;

  const overviewHeaderEnd = useMemo(() => {
    const pid = projectId?.trim();
    if (!pid) return null;
    if (!unpublishedMode && !reportingRunRiskCountSnapshotRow) return null;
    return (
      <PortfolioReportingMonthSelect
        projectId={projectId}
        showUnpublishedOption
        initialUrlSearch={initialUrlSearch}
      />
    );
  }, [initialUrlSearch, projectId, reportingRunRiskCountSnapshotRow, unpublishedMode]);

  useEffect(() => {
    setExtras({
      titleSuffix: "Project Overview",
      end: overviewHeaderEnd,
    });
    return () => setExtras(null);
  }, [overviewHeaderEnd, setExtras]);

  const simulationHref = projectId ? riskaiPath(`/projects/${projectId}/simulation`) : DASHBOARD_PATH;

  if (!reportingRunRiskCountSnapshotRow) {
    return (
      <main className="ds-document-page pb-[var(--ds-space-3)]">
        <div className={`${overviewDocumentTileClass} max-w-lg mx-auto p-8 text-center`}>
          <p className="text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)] m-0">
            {unpublishedMode ? "No unlocked simulation data" : "No reporting run locked"}
          </p>
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 mt-2 max-w-md mx-auto">
            {unpublishedMode
              ? "Run a simulation to see unpublished results here, or choose a reporting month above."
              : "Lock a simulation for reporting to populate this overview. Reporting uses only the latest locked run—not draft or unlocked simulations."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={simulationHref} className="no-underline">
              <Button>Go to Simulation</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const riskRatingTile = showProjectStatusSkeleton ? null : projectRiskRatingTileCopy(ragStatus);
  const activeN = reportingRunActiveRiskCount(reportingRunRiskCountSnapshotRow);
  const highN = reportingRunHighExtremeCount(reportingRunRiskCountSnapshotRow, risks);
  const projectRiskRatingSubtext = `${activeN} risk${activeN === 1 ? "" : "s"} in reporting run${
    highN > 0 ? ` · ${highN} high / extreme` : ""
  }`;

  const targetLabelShort = targetAppetite;

  return (
    <main
      className="ds-document-page pb-[var(--ds-space-3)]"
      aria-busy={loadingRisks || undefined}
    >
      {/* Row 1 — headline KPIs (aligned with portfolio KPI strip) */}
      <section className="mb-8" aria-labelledby="project-kpi-heading">
        <h2 id="project-kpi-heading" className="sr-only">
          Project KPI summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {showProjectStatusSkeleton ? (
            <div className={`${overviewDocumentTileClass} flex flex-col p-4 min-h-32`}>
              <p className={`${overviewTileTitleClass} mb-2`}>{PROJECT_RISK_RATING_KPI_TITLE}</p>
              <OverviewProjectStatusSkeleton />
            </div>
          ) : (
            <SummaryTile
              title={PROJECT_RISK_RATING_KPI_TITLE}
              primaryValue={riskRatingTile!.primary}
              primaryValueClassName={riskRatingTile!.primaryValueClassName}
              primaryRagDot={riskRatingTile!.primaryRagDot}
              subtext={projectRiskRatingSubtext}
              onActivate={() => openOverviewAt(0)}
              selected={overviewModalOpen && overviewModalIndex === 0}
            />
          )}

          {showProjectStatusSkeleton ? (
            <div className={`${overviewDocumentTileClass} flex flex-col p-4 min-h-32`}>
              <p className={`${overviewTileTitleClass} mb-2`}>Project Health</p>
              <OverviewProjectStatusSkeleton />
            </div>
          ) : (
            <SummaryTile
              title="Project Health"
              primaryValue={healthTile.primary}
              primaryValueClassName={healthTile.primaryValueClassName}
              primaryRagDot={healthTile.primaryRagDot}
              subtext={projectHealthSubtext}
              onActivate={() => openOverviewAt(1)}
              selected={overviewModalOpen && overviewModalIndex === 1}
            />
          )}

          <SummaryTile
            title="Cost Gap to Target"
            primaryValue={dollarGapLabel}
            primaryValueClassName={costGapPrimaryClass}
            primaryRagDot={costGapPrimaryRag}
            subtext={costGapTileSubtext}
            onActivate={() => openOverviewAt(2)}
            selected={overviewModalOpen && overviewModalIndex === 2}
          />

          <SummaryTile
            title="Time Gap to Target"
            primaryValue={timeGapWeeksLabel}
            primaryValueClassName={timeGapPrimaryClass}
            primaryRagDot={timeGapPrimaryRag}
            subtext={timeGapTileSubtext}
            onActivate={() => openOverviewAt(3)}
            selected={overviewModalOpen && overviewModalIndex === 3}
          />
        </div>
      </section>

      {/* Row 2 — exposure histograms */}
      <section className="mb-8 flex flex-col gap-4 lg:gap-6" aria-labelledby="project-exposure-heading">
        <h2 id="project-exposure-heading" className="sr-only">
          Project cost and schedule exposure
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          <ProjectExposureHistogramCard
            title="Cost Exposure"
            data={costExposureBarData}
            targetX={costAtAppetiteLine}
            currentPLineStroke={costExposureCurrentPLineStroke}
            pValueX={costFundingReferenceDollars}
            pValueLabel={currentConfidenceLabel}
            formatX={formatCurrency}
            targetLabel={targetLabelShort}
            supportingSubline={costExposureContingencySubline}
            onActivate={() => openOverviewAt(4)}
            modalSelected={overviewModalOpen && overviewModalIndex === 4}
            activateAriaLabel="Open cost exposure details"
          />
          <ProjectExposureHistogramCard
            title="Schedule Exposure"
            data={scheduleExposureBarData}
            targetX={timeAtAppetiteLine}
            currentPLineStroke={scheduleExposureCurrentPLineStroke}
            pValueX={scheduleReferenceDaysForChart}
            pValueLabel={currentScheduleConfidenceLabel}
            formatX={formatDurationDays}
            targetLabel={targetLabelShort}
            supportingSubline={scheduleExposureContingencySubline}
            onActivate={() => openOverviewAt(5)}
            modalSelected={overviewModalOpen && overviewModalIndex === 5}
            activateAriaLabel="Open schedule exposure details"
          />
        </div>
      </section>

      {/* Executive drivers — locked reporting snapshot + risk register (same signals as prior insight strip) */}
      <section className="mb-8" aria-labelledby="project-executive-drivers-heading">
        <h2 id="project-executive-drivers-heading" className="sr-only">
          Key cost, schedule, and opportunity drivers
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DashboardCard
            title="Key Cost Drivers"
            onActivate={() => openOverviewAt(6)}
            modalSelected={overviewModalOpen && overviewModalIndex === 6}
            activateAriaLabel="Open key cost drivers details"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : topThreeKeyCostDrivers.length > 0 ? (
              <ExecutiveDriverCardPreview
                rows={topThreeKeyCostDrivers.map((line) => ({
                  key: line.riskId,
                  heading: line.riskName,
                  valueDisplay: line.exposureUsd != null ? formatCurrency(line.exposureUsd) : "—",
                }))}
              />
            ) : (
              <ExecutiveDriverCardFallback
                name={keyCostRisk ?? "—"}
                valueDisplay={keyCostRiskImpact != null ? formatCurrency(keyCostRiskImpact) : "—"}
              />
            )}
          </DashboardCard>
          <DashboardCard
            title="Key Schedule Drivers"
            onActivate={() => openOverviewAt(7)}
            modalSelected={overviewModalOpen && overviewModalIndex === 7}
            activateAriaLabel="Open key schedule drivers details"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : topThreeScheduleDriverRows.length > 0 ? (
              <ExecutiveDriverCardPreview
                rows={scheduleDrivers.slice(0, 3).map((line) => ({
                  key: line.riskId,
                  heading: line.riskName,
                  valueDisplay: line.totalDays > 0 ? formatDurationDays(line.totalDays) : "—",
                }))}
              />
            ) : (
              <ExecutiveDriverCardFallback
                name={keyTimeRisk ?? "—"}
                valueDisplay={
                  keyTimeRiskDays != null && keyTimeRiskDays > 0 ? formatDurationDays(keyTimeRiskDays) : "—"
                }
              />
            )}
          </DashboardCard>
          <DashboardCard
            title="Key Opportunities"
            onActivate={() => openOverviewAt(8)}
            modalSelected={overviewModalOpen && overviewModalIndex === 8}
            activateAriaLabel="Open key opportunities details"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : topThreeOpportunityRows.length > 0 ? (
              <ExecutiveDriverCardPreview
                rows={[...costDrivers]
                  .filter((d) => d.delta > 0)
                  .sort((a, b) => b.delta - a.delta)
                  .slice(0, 3)
                  .map((line) => ({
                    key: line.riskId,
                    heading: line.riskName,
                    valueDisplay: formatCurrency(line.delta),
                  }))}
              />
            ) : (
              <ExecutiveDriverCardFallback
                name={keyOpportunityInfo?.name ?? "—"}
                valueDisplay={
                  keyOpportunityInfo != null && keyOpportunityInfo.delta > 0
                    ? formatCurrency(keyOpportunityInfo.delta)
                    : "—"
                }
              />
            )}
          </DashboardCard>
        </div>
      </section>

      {/* Supporting breakdown — reporting-run scoped register (portfolio horizontal-bar pattern) */}
      <section className="mb-0" aria-labelledby="project-register-mix-heading">
        <h2 id="project-register-mix-heading" className="sr-only">
          Risk mix by status, severity, category, and owner
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Status"
            onActivate={() => openOverviewAt(9)}
            modalSelected={overviewModalOpen && overviewModalIndex === 9}
            activateAriaLabel="Open full risks by status breakdown"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : (
              <PortfolioRiskStatusCountsTable rows={projectRiskStatusCounts} />
            )}
          </DashboardCard>
          <DashboardCard
            title="Severity"
            onActivate={() => openOverviewAt(10)}
            modalSelected={overviewModalOpen && overviewModalIndex === 10}
            activateAriaLabel="Open full risks by severity breakdown"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : (
              <PortfolioRiskSeverityCountsTable activeRiskSummaryRows={projectSeveritySummaryRows} />
            )}
          </DashboardCard>
          <DashboardCard
            title="Category"
            headerActions={
              !loadingRisks && projectRiskCategoryCounts.length > 5 ? (
                <PortfolioCategoryBreakdownTrigger
                  open={categoryOwnerBreakdownOpen}
                  onToggle={toggleCategoryOwnerBreakdown}
                />
              ) : null
            }
            onActivate={() => openOverviewAt(11)}
            modalSelected={overviewModalOpen && overviewModalIndex === 11}
            activateAriaLabel="Open full risks by category breakdown"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : (
              <PortfolioRiskCategoryCountsTable
                rows={projectRiskCategoryCounts}
                breakdownOpen={categoryOwnerBreakdownOpen}
              />
            )}
          </DashboardCard>
          <DashboardCard
            title="Owner"
            headerActions={
              !loadingRisks && projectRiskOwnerCounts.length > 5 ? (
                <PortfolioOwnerBreakdownTrigger
                  open={categoryOwnerBreakdownOpen}
                  onToggle={toggleCategoryOwnerBreakdown}
                />
              ) : null
            }
            onActivate={() => openOverviewAt(12)}
            modalSelected={overviewModalOpen && overviewModalIndex === 12}
            activateAriaLabel="Open full risks by owner breakdown"
          >
            {loadingRisks ? (
              <OverviewInsightBodySkeleton />
            ) : (
              <PortfolioRiskOwnerCountsTable
                rows={projectRiskOwnerCounts}
                breakdownOpen={categoryOwnerBreakdownOpen}
              />
            )}
          </DashboardCard>
        </div>
      </section>

      <DocumentKpiModal
        open={overviewModalOpen}
        tiles={overviewTiles}
        index={overviewModalIndex}
        onIndexChange={setOverviewModalIndex}
        onClose={() => setOverviewModalOpen(false)}
        projectTilePayloads={projectTilePayloadsForRagModal}
        needsAttentionHealthRun={projectNeedsAttentionHealthRun}
        needsAttentionStaleCopyMode="reportingMonthLock"
        renderSlideBodyByIndex={renderProjectOverviewSlideBody}
      />
    </main>
  );
}
