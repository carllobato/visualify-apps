"use client";

import Link from "next/link";
import { Suspense, useMemo, useEffect, useState } from "react";
import { Button } from "@visualify/design-system";
import {
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import type { SimulationSnapshotRow } from "@/lib/db/snapshots";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatDurationDays } from "@/lib/formatDuration";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import { usePageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { SummaryTile } from "@/components/dashboard/SummaryTile";
import type { Risk } from "@/domain/risk/risk.schema";
import { applyStaleReportingLockRag, computeRag, type RagStatus } from "@/lib/dashboard/projectTileServerData";
import {
  buildCostDriverLines,
  buildScheduleDriverLines,
  computeNeutralForwardExposure,
  formatPercentileLabel,
  interpolateSnapshotAtRiskPercentile,
  nearestReportingAnchorPercentile,
  optionalBufferFromSnapshotPayload,
  snapshotCostAtAnchor,
  snapshotTimeAtAnchor,
  topCostRiskTitleFromSnapshotPayload,
  topTimeRiskTitleFromSnapshotPayload,
  reportingRunActiveRiskCount,
  reportingRunHighExtremeCount,
} from "@/lib/projectOverviewReporting";

type CdfChartPoint = { x: number; p: number };

const CHART_HEIGHT = 200;
/** Extra top room for on-chart “Target (PXX)” / “Current” labels. */
const CHART_MARGIN = { top: 14, right: 12, left: 4, bottom: 4 };

/** Same chrome as `SummaryTile` / portfolio KPI tiles (document tile tokens + hover). */
const overviewDocumentTileClass = "ds-document-tile-panel ds-document-tile-panel--interactive";

/** Tile section label: aligned with `SummaryTile` title typography. */
const overviewTileTitleClass = "text-sm font-medium text-[var(--ds-text-secondary)] m-0 mb-1";

/** P on the piecewise-linear CDF at x (same anchors as the line). */
function interpolatePAtX(points: CdfChartPoint[], x: number): number | null {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (sorted.length < 2) return null;
  if (x <= sorted[0].x) return sorted[0].p;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].p;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.p + t * (b.p - a.p);
    }
  }
  return null;
}

function DistributionTooltipContent({
  active,
  payload,
  formatX,
  currentX,
  points,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CdfChartPoint }>;
  formatX: (n: number) => string;
  currentX: number | null;
  points: CdfChartPoint[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (point == null) return null;

  const closestToMean = points.reduce<CdfChartPoint | null>((best, p) => {
    if (currentX == null) return best;
    if (best == null) return p;
    return Math.abs(p.x - currentX) < Math.abs(best.x - currentX) ? p : best;
  }, null);

  const isNearestAnchorToMean =
    currentX != null &&
    closestToMean != null &&
    Math.abs(point.x - closestToMean.x) < 1e-9 &&
    Math.abs(point.p - closestToMean.p) < 1e-9;

  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-2.5 py-1.5 text-[length:var(--ds-text-xs)] shadow-[var(--ds-shadow-sm)]">
      <p className="m-0 font-medium text-[var(--ds-text-primary)] tabular-nums leading-snug">
        P{point.p} • {formatX(point.x)}
      </p>
      {isNearestAnchorToMean ? (
        <p className="m-0 mt-0.5 text-[10px] text-[var(--ds-text-muted)]">(Current)</p>
      ) : null}
    </div>
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

function formatSignedTimeGap(meanDays: number | null, appetiteLineDays: number | null): string {
  if (meanDays == null || appetiteLineDays == null) return "—";
  if (!Number.isFinite(meanDays) || !Number.isFinite(appetiteLineDays)) return "—";
  const d = meanDays - appetiteLineDays;
  if (d === 0) return formatDurationDays(0);
  const sign = d < 0 ? "-" : "+";
  return `${sign}${formatDurationDays(Math.abs(d))}`;
}

export type ProjectOverviewInitialData = {
  projectId: string;
  /** Latest row with `locked_for_reporting`; null if none. */
  reportingSnapshot: SimulationSnapshotRow | null;
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

function DashCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${overviewDocumentTileClass} flex flex-col p-4 min-h-[88px] ${className ?? ""}`}>
      {children}
    </div>
  );
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

function BufferBar({ fraction }: { fraction: number | null }) {
  const pct = fraction == null ? null : Math.round(Math.min(100, Math.max(0, fraction * 100)));
  return (
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--ds-surface-muted)]">
      {pct != null ? (
        <div
          className="h-full rounded-full bg-[var(--ds-text-secondary)] transition-[width] duration-300"
          style={{ width: `${Math.max(pct, 3)}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      ) : null}
    </div>
  );
}

function DistributionMiniChart({
  title,
  helperLine,
  points,
  currentX,
  targetX,
  targetLabel,
  formatX,
}: {
  title: string;
  /** Optional muted line under the title (e.g. cost model context). */
  helperLine?: string;
  points: CdfChartPoint[];
  currentX: number | null;
  targetX: number | null;
  targetLabel: string;
  formatX: (n: number) => string;
}) {
  const hasLine = points.length >= 2;
  const stroke = "var(--ds-text-secondary)";

  const pAtCurrent =
    hasLine && currentX != null && Number.isFinite(currentX)
      ? interpolatePAtX(points, currentX)
      : null;

  const showCurrentGuide = currentX != null && Number.isFinite(currentX);
  const showTargetGuide = targetX != null && Number.isFinite(targetX);
  const showCurrentDot = showCurrentGuide && pAtCurrent != null;

  return (
    <DashCard className="!min-h-0 flex flex-col gap-3">
      <h3 className="text-sm font-medium text-[var(--ds-text-secondary)] m-0">{title}</h3>
      {helperLine ? (
        <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] leading-snug">{helperLine}</p>
      ) : null}
      {!hasLine ? (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 py-8 text-center">Unavailable</p>
      ) : (
        <div
          className="w-full min-h-[200px] overflow-hidden rounded-[var(--ds-radius-sm)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-surface)]"
          style={{ height: CHART_HEIGHT }}
          aria-label={title}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={CHART_MARGIN}>
              <XAxis
                type="number"
                dataKey="x"
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 10, fill: "var(--ds-text-muted)", opacity: 1 }}
                tickFormatter={(v) => formatX(Number(v))}
                axisLine={{ stroke: "var(--ds-chart-panel-border)", strokeOpacity: 1 }}
                tickLine={{ stroke: "var(--ds-chart-panel-border)", strokeOpacity: 1 }}
              />
              <YAxis
                type="number"
                dataKey="p"
                domain={[0, 100]}
                width={32}
                tick={{ fontSize: 10, fill: "var(--ds-text-muted)", opacity: 1 }}
                tickFormatter={(v) => `P${v}`}
                axisLine={{ stroke: "var(--ds-chart-panel-border)", strokeOpacity: 1 }}
                tickLine={{ stroke: "var(--ds-chart-panel-border)", strokeOpacity: 1 }}
              />
              <Tooltip
                content={(props) => (
                  <DistributionTooltipContent
                    active={props.active}
                    payload={props.payload}
                    formatX={formatX}
                    currentX={currentX}
                    points={points}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="p"
                stroke={stroke}
                strokeOpacity={0.38}
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: stroke, strokeWidth: 0, fillOpacity: 0.42 }}
                activeDot={{ r: 4, fillOpacity: 0.65 }}
                isAnimationActive={false}
              />
              {showTargetGuide ? (
                <ReferenceLine
                  x={targetX}
                  stroke="var(--ds-border)"
                  strokeOpacity={0.6}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  label={{
                    value: `Target (${targetLabel})`,
                    position: "insideTop",
                    fill: "var(--ds-text-muted)",
                    fillOpacity: 1,
                    fontSize: 10,
                  }}
                />
              ) : null}
              {showCurrentGuide ? (
                <ReferenceLine
                  x={currentX}
                  stroke="var(--ds-text-primary)"
                  strokeOpacity={0.8}
                  strokeWidth={2}
                />
              ) : null}
              {showCurrentDot ? (
                <ReferenceDot
                  x={currentX}
                  y={pAtCurrent}
                  r={7}
                  fill="var(--ds-text-primary)"
                  fillOpacity={1}
                  stroke="var(--ds-chart-surface)"
                  strokeWidth={2}
                  strokeOpacity={1}
                  label={{
                    value: "Current",
                    position: "top",
                    fill: "var(--ds-text-primary)",
                    fillOpacity: 0.88,
                    fontSize: 10,
                  }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashCard>
  );
}

export function ProjectOverviewContent({ initialData }: ProjectOverviewContentProps) {
  const { projectId, reportingSnapshot } = initialData ?? {
    projectId: "",
    reportingSnapshot: null,
  };

  const { setRisks } = useRiskRegister();
  const { setExtras } = usePageHeaderExtras();
  const [risks, setRisksLocal] = useState<Risk[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(true);
  const [projectSettingsResolved, setProjectSettingsResolved] = useState<ProjectContext | null>(null);
  const [projectSettingsReady, setProjectSettingsReady] = useState(false);

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
        const parsed = parseProjectContextFromVisualifyProjectSettingsRow(row as Record<string, unknown>);
        if (parsed) next = parsed;
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
    if (!reportingSnapshot) return null;
    return buildSimulationFromDbRow(reportingSnapshot);
  }, [reportingSnapshot]);

  const projectContext = useMemo(() => {
    const pid = projectId?.trim();
    if (!pid) return null;
    if (!projectSettingsReady) return loadProjectContext(pid);
    return projectSettingsResolved;
  }, [projectId, projectSettingsReady, projectSettingsResolved]);

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

  const current = builtFromReporting?.current;

  const neutralExposure = useMemo(
    () => (risks.length > 0 ? computeNeutralForwardExposure(risks) : null),
    [risks]
  );

  const costDrivers = useMemo(() => {
    if (!neutralExposure) return [];
    return buildCostDriverLines(current, risks, neutralExposure);
  }, [current, risks, neutralExposure]);

  const scheduleDrivers = useMemo(() => buildScheduleDriverLines(current, risks), [current, risks]);

  const keyCostRisk =
    costDrivers[0]?.riskName ?? topCostRiskTitleFromSnapshotPayload(reportingSnapshot);
  const keyTimeRisk =
    scheduleDrivers[0]?.riskName ?? topTimeRiskTitleFromSnapshotPayload(reportingSnapshot);

  const keyOpportunityInfo = useMemo(() => {
    const best = [...costDrivers].filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta)[0];
    return best ? { name: best.riskName, delta: best.delta } : null;
  }, [costDrivers]);

  const keyCostRiskImpact = useMemo(() => {
    const id = costDrivers[0]?.riskId;
    if (!id || !neutralExposure) return null;
    const t = neutralExposure.topDrivers.find((d) => d.riskId === id);
    return t != null && Number.isFinite(t.total) && t.total >= 0 ? t.total : null;
  }, [costDrivers, neutralExposure]);

  const keyTimeRiskDays = scheduleDrivers[0]?.totalDays ?? null;

  const snapshotPayloadBuffer = useMemo(
    () => (reportingSnapshot ? optionalBufferFromSnapshotPayload(reportingSnapshot) : null),
    [reportingSnapshot]
  );

  const costAtAppetiteLine = useMemo(
    () =>
      reportingSnapshot
        ? interpolateSnapshotAtRiskPercentile(reportingSnapshot, targetPercent, "cost")
        : null,
    [reportingSnapshot, targetPercent]
  );

  const timeAtAppetiteLine = useMemo(
    () =>
      reportingSnapshot
        ? interpolateSnapshotAtRiskPercentile(reportingSnapshot, targetPercent, "time")
        : null,
    [reportingSnapshot, targetPercent]
  );

  const meanCostFromSnapshot = useMemo(() => {
    if (!reportingSnapshot) return null;
    const m = Number(reportingSnapshot.cost_mean);
    return Number.isFinite(m) ? m : null;
  }, [reportingSnapshot]);

  const meanTimeFromSnapshot = useMemo(() => {
    if (!reportingSnapshot) return null;
    const m = Number(reportingSnapshot.time_mean);
    return Number.isFinite(m) ? m : null;
  }, [reportingSnapshot]);

  const dollarGapLabel = useMemo(
    () => formatSignedDollarGap(meanCostFromSnapshot, costAtAppetiteLine),
    [meanCostFromSnapshot, costAtAppetiteLine]
  );

  const timeGapLabel = useMemo(
    () => formatSignedTimeGap(meanTimeFromSnapshot, timeAtAppetiteLine),
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

  const nearestAnchor = useMemo(
    () => nearestReportingAnchorPercentile(targetPercent),
    [targetPercent]
  );

  const currentConfidenceLabel = useMemo(() => {
    if (!reportingSnapshot) return null;
    const v = snapshotCostAtAnchor(reportingSnapshot, nearestAnchor);
    if (v == null) return null;
    return formatPercentileLabel(nearestAnchor);
  }, [reportingSnapshot, nearestAnchor]);

  const costCdfPoints = useMemo((): CdfChartPoint[] => {
    if (!reportingSnapshot) return [];
    const anchors = [20, 50, 80, 90] as const;
    const pts: CdfChartPoint[] = [];
    for (const a of anchors) {
      const v = snapshotCostAtAnchor(reportingSnapshot, a);
      if (v != null && Number.isFinite(v)) pts.push({ x: v, p: a });
    }
    pts.sort((x, y) => x.x - y.x);
    return pts;
  }, [reportingSnapshot]);

  const timeCdfPoints = useMemo((): CdfChartPoint[] => {
    if (!reportingSnapshot) return [];
    const anchors = [20, 50, 80, 90] as const;
    const pts: CdfChartPoint[] = [];
    for (const a of anchors) {
      const v = snapshotTimeAtAnchor(reportingSnapshot, a);
      if (v != null && Number.isFinite(v)) pts.push({ x: v, p: a });
    }
    pts.sort((x, y) => x.x - y.x);
    return pts;
  }, [reportingSnapshot]);

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

  const costBufferBarFraction = useMemo(() => {
    if (bufferCostNumeric == null || bufferCostNumeric <= 0) return null;
    const den = Math.max(
      bufferCostNumeric,
      meanCostFromSnapshot ?? 0,
      costAtAppetiteLine ?? 0,
      1
    );
    return bufferCostNumeric / den;
  }, [bufferCostNumeric, meanCostFromSnapshot, costAtAppetiteLine]);

  const timeBufferBarFraction = useMemo(() => {
    if (bufferTimeNumeric == null || bufferTimeNumeric <= 0) return null;
    const den = Math.max(
      bufferTimeNumeric,
      meanTimeFromSnapshot ?? 0,
      timeAtAppetiteLine ?? 0,
      1
    );
    return bufferTimeNumeric / den;
  }, [bufferTimeNumeric, meanTimeFromSnapshot, timeAtAppetiteLine]);

  const ragStatus = useMemo(() => {
    const lastAt = reportingSnapshot?.locked_at ?? reportingSnapshot?.created_at ?? null;
    const base = computeRag({
      riskCount: reportingRunActiveRiskCount(reportingSnapshot),
      highSeverityCount: reportingRunHighExtremeCount(reportingSnapshot, risks),
      lastLockedReportingAt: lastAt,
    });
    return applyStaleReportingLockRag(base, reportingSnapshot ?? undefined, Date.now());
  }, [reportingSnapshot, risks]);

  /** RAG subline can use snapshot `inputs_used` without waiting for the risk register. */
  const projectStatusStatsNeedRegister =
    !reportingSnapshot?.payload?.inputs_used?.length;
  const showProjectStatusSkeleton = loadingRisks && projectStatusStatsNeedRegister;

  const overviewHeaderEnd = useMemo(() => {
    if (!reportingSnapshot) return null;
    return (
      <Suspense
        fallback={
          <div
            className="h-9 min-w-[10.5rem] max-w-[16rem] animate-pulse rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-muted)]"
            aria-hidden
          />
        }
      >
        <PortfolioReportingMonthSelect projectId={projectId} />
      </Suspense>
    );
  }, [reportingSnapshot]);

  useEffect(() => {
    setExtras({
      titleSuffix: "Project Overview",
      end: overviewHeaderEnd,
    });
    return () => setExtras(null);
  }, [overviewHeaderEnd, setExtras]);

  const simulationHref = projectId ? riskaiPath(`/projects/${projectId}/simulation`) : DASHBOARD_PATH;

  /** Mean minus appetite line: ≤0 (at/under target) reads favorable. */
  const gapValueClass = (meanMinusAppetite: number | null) => {
    if (meanMinusAppetite == null || !Number.isFinite(meanMinusAppetite)) {
      return "text-[var(--ds-text-primary)]";
    }
    if (meanMinusAppetite <= 0) return "text-[var(--ds-status-success-fg)]";
    return "text-[var(--ds-status-danger-fg)]";
  };

  if (!reportingSnapshot) {
    return (
      <main className="ds-document-page">
        <div className={`${overviewDocumentTileClass} max-w-lg mx-auto p-8 text-center`}>
          <p className="text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)] m-0">
            No reporting run locked
          </p>
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 mt-2 max-w-md mx-auto">
            Lock a simulation for reporting to populate this overview. Reporting uses only the latest locked
            run—not draft or unlocked simulations.
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
  const activeN = reportingRunActiveRiskCount(reportingSnapshot);
  const highN = reportingRunHighExtremeCount(reportingSnapshot, risks);
  const projectRiskRatingSubtext = `${activeN} risk${activeN === 1 ? "" : "s"} in reporting run${
    highN > 0 ? ` · ${highN} high / extreme` : ""
  }`;

  const targetLabelShort = targetAppetite;

  /** Same basis as `currentConfidenceLabel` (nearest reporting anchor vs configured target). */
  const confidenceVsTargetDir =
    currentConfidenceLabel != null
      ? nearestAnchor > targetPercent
        ? "above"
        : nearestAnchor < targetPercent
          ? "below"
          : null
      : null;

  return (
    <main className="ds-document-page" aria-busy={loadingRisks || undefined}>
      {/* Row 1 — headline metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {showProjectStatusSkeleton ? (
          <DashCard>
            <p className={`${overviewTileTitleClass} mb-2`}>Project Risk Rating</p>
            <OverviewProjectStatusSkeleton />
          </DashCard>
        ) : (
          <SummaryTile
            title="Project Risk Rating"
            primaryValue={riskRatingTile!.primary}
            primaryValueClassName={riskRatingTile!.primaryValueClassName}
            primaryRagDot={riskRatingTile!.primaryRagDot}
            subtext={projectRiskRatingSubtext}
          />
        )}

        <DashCard>
          <p className={`${overviewTileTitleClass} mb-2`}>Target vs current confidence</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-3xl font-bold tracking-tight text-[var(--ds-text-primary)] tabular-nums">
                {currentConfidenceLabel ?? "—"}
              </span>
              <span className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">(Current)</span>
              {confidenceVsTargetDir === "above" ? (
                <span
                  className="text-base leading-none text-[var(--ds-status-success-fg)]"
                  aria-label="Above target"
                  role="img"
                >
                  ↑
                </span>
              ) : confidenceVsTargetDir === "below" ? (
                <span
                  className="text-base leading-none text-[var(--ds-status-danger-fg)]"
                  aria-label="Below target"
                  role="img"
                >
                  ↓
                </span>
              ) : null}
            </div>
            <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 tabular-nums">
              Target: {targetAppetite}
            </p>
          </div>
        </DashCard>

        <DashCard>
          <p className={overviewTileTitleClass}>$ gap to target</p>
          <p
            className={`text-3xl font-semibold tracking-tight m-0 tabular-nums ${gapValueClass(dollarGapSigned)}`}
          >
            {dollarGapLabel}
          </p>
          <p className="m-0 mt-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] leading-snug">
            Mean vs simulated cost at target P (includes commercial impact from modeled delay).
          </p>
        </DashCard>

        <DashCard>
          <p className={overviewTileTitleClass}>Time gap to target</p>
          <p
            className={`text-3xl font-semibold tracking-tight m-0 tabular-nums ${gapValueClass(timeGapSigned)}`}
          >
            {timeGapLabel}
          </p>
        </DashCard>
      </div>

      {/* Row 2 — distributions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <DistributionMiniChart
          title="Cost distribution"
          helperLine="Simulated cost includes delay-related commercial impact when modeled."
          points={costCdfPoints}
          currentX={meanCostFromSnapshot}
          targetX={costAtAppetiteLine}
          targetLabel={targetLabelShort}
          formatX={(n) => formatCurrency(n)}
        />
        <DistributionMiniChart
          title="Time distribution"
          points={timeCdfPoints}
          currentX={meanTimeFromSnapshot}
          targetX={timeAtAppetiteLine}
          targetLabel={targetLabelShort}
          formatX={(n) => formatDurationDays(n)}
        />
      </div>

      {/* Row 3 — buffer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
        <DashCard>
          <p className={overviewTileTitleClass}>$ contingency remaining</p>
          <p className="text-2xl font-semibold tracking-tight text-[var(--ds-text-primary)] m-0 mt-2 tabular-nums">
            {bufferCostDisplay}
          </p>
          <BufferBar fraction={costBufferBarFraction} />
        </DashCard>
        <DashCard>
          <p className={overviewTileTitleClass}>Time contingency remaining</p>
          <p className="text-2xl font-semibold tracking-tight text-[var(--ds-text-primary)] m-0 mt-2 tabular-nums">
            {bufferTimeDisplay}
          </p>
          <BufferBar fraction={timeBufferBarFraction} />
        </DashCard>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DashCard>
          <p className={overviewTileTitleClass}>Key cost risk</p>
          {loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <>
              <p className="text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)] m-0 leading-snug line-clamp-3">
                {keyCostRisk ?? "—"}
              </p>
              {keyCostRiskImpact != null ? (
                <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 mt-2 tabular-nums">
                  {formatCurrency(keyCostRiskImpact)} exposure
                </p>
              ) : null}
            </>
          )}
        </DashCard>
        <DashCard>
          <p className={overviewTileTitleClass}>Key time risk</p>
          {loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <>
              <p className="text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)] m-0 leading-snug line-clamp-3">
                {keyTimeRisk ?? "—"}
              </p>
              {keyTimeRiskDays != null && keyTimeRiskDays > 0 ? (
                <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 mt-2 tabular-nums">
                  {formatDurationDays(keyTimeRiskDays)} mean
                </p>
              ) : null}
            </>
          )}
        </DashCard>
        <DashCard>
          <p className={overviewTileTitleClass}>Key opportunity</p>
          {loadingRisks ? (
            <OverviewInsightBodySkeleton />
          ) : (
            <>
              <p className="text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)] m-0 leading-snug line-clamp-3">
                {keyOpportunityInfo?.name ?? "—"}
              </p>
              {keyOpportunityInfo != null && keyOpportunityInfo.delta > 0 ? (
                <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] m-0 mt-2 tabular-nums">
                  {formatCurrency(keyOpportunityInfo.delta)} planned mitigation reduction
                </p>
              ) : null}
            </>
          )}
        </DashCard>
      </div>
    </main>
  );
}
