"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Button,
  Callout,
  Card,
  CardContent,
  Label,
  Textarea,
} from "@visualify/design-system";
import { usePathname, useRouter } from "next/navigation";
import { useRiskRegister } from "@/store/risk-register.store";
import {
  getLatestSnapshot,
  setSnapshotAsReportingVersion,
  type SimulationSnapshotRow,
  type SimulationSnapshotRowDb,
} from "@/lib/db/snapshots";
import { listRisks, DEFAULT_PROJECT_ID } from "@/lib/db/risks";
import { fetchPublicProfile, formatTriggeredByLabel } from "@/lib/profiles/profileDb";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { useProjectPermissions } from "@/contexts/ProjectPermissionsContext";
import { DASHBOARD_PATH, projectIdFromAppPathname, riskaiPath } from "@/lib/routes";
import {
  getNeutralSummary,
  getNeutralSamples,
  getNeutralTimeSamples,
  getNeutralTimeSummary,
} from "@/store/selectors";
import { loadProjectContext, formatMoneyMillions, isProjectContextComplete } from "@/lib/projectContext";
import { formatDurationDays } from "@/lib/formatDuration";
import {
  distributionToCostCdf,
  distributionToTimeCdf,
  binSamplesIntoHistogram,
  binSamplesIntoTimeHistogram,
  deriveCostHistogramFromPercentiles,
  deriveTimeHistogramFromPercentiles,
  type CostCdfPoint,
  type TimeCdfPoint,
} from "@/lib/simulationDisplayUtils";
import {
  SimulationSection,
  type SimulationSectionBaseline,
  type CostResults,
  type TimeResults,
} from "@/components/simulation/SimulationSection";
import type { SimulationRiskSnapshot } from "@/domain/simulation/simulation.types";

const DISTRIBUTION_BIN_COUNT = 28;

/** Stable empty array for snapshot risks to avoid new [] identity every render. */
const EMPTY_SNAPSHOT_RISKS: SimulationRiskSnapshot[] = [];

function formatDash<T>(value: T | undefined | null, formatter: (v: T) => string): string {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  return formatter(value as T);
}

/** Parse risk appetite e.g. "P80" -> 80. */
function riskAppetiteToPercent(riskAppetite: string): number {
  const n = parseInt(riskAppetite.replace(/^P/, ""), 10);
  return Number.isFinite(n) ? n : 50;
}

function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card
      variant="elevated"
      className="transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_140%,var(--ds-text-muted))]"
    >
      <CardContent className="p-3">
        <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
          {label}
        </div>
        <div className="mt-0.5 text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">{value}</div>
        {helper && (
          <div className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">{helper}</div>
        )}
      </CardContent>
    </Card>
  );
}

const linkSecondaryClassName =
  "inline-flex h-9 items-center justify-center rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] no-underline transition-all duration-150 hover:bg-[var(--ds-surface-muted)]";

const ACTIVE_PROJECT_KEY = "activeProjectId";

/**
 * `app/(protected)/template.tsx` remounts pages on client navigation while the risk-register
 * store persists. Without this, every simulation mount clears the store and refetches even for
 * the same project — visible as a wipe → “Loading…” → charts popping back in.
 */
let lastSimulationBootstrapProjectId: string | undefined;

/** Build YYYY-MM for a given date. */
function toMonthYearKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Format YYYY-MM as "March 2025". */
function formatReportingMonthYear(ym: string | null | undefined): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "—";
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Options for reporting month/year: current month and next 11 months. */
function getReportingMonthYearOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const start = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    options.push({ value: toMonthYearKey(d), label: formatReportingMonthYear(toMonthYearKey(d)) });
  }
  return options;
}

export type SimulationPageProps = { projectId?: string | null };

/** After load: we know whether this project has a snapshot. Only show results when hasSnapshot is true. */
type SnapshotState = { projectId: string; hasSnapshot: boolean } | null;

export default function SimulationPage({ projectId: urlProjectId }: SimulationPageProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { risks, simulation, runSimulation, clearSimulationHistory, hasDraftRisks, invalidRunnableCount, setRisks, hydrateSimulationFromDbSnapshot } = useRiskRegister();
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [runBlockedInvalidCount, setRunBlockedInvalidCount] = useState<number | null>(null);
  const [projectContext, setProjectContext] = useState<ReturnType<typeof loadProjectContext>>(null);
  const [gateChecked, setGateChecked] = useState(false);
  /** If non-null and projectId matches current project: hasSnapshot true = show results, false = show Run simulation only. */
  const [snapshotForProject, setSnapshotForProject] = useState<SnapshotState>(null);
  const effectiveProjectIdRef = useRef<string | undefined>(undefined);
  const hydrateRef = useRef(hydrateSimulationFromDbSnapshot);
  hydrateRef.current = hydrateSimulationFromDbSnapshot;
  const clearRef = useRef(clearSimulationHistory);
  clearRef.current = clearSimulationHistory;
  const setRisksRef = useRef(setRisks);
  setRisksRef.current = setRisks;
  const simulationRef = useRef(simulation);
  simulationRef.current = simulation;

  const [activeProjectIdFromStorage, setActiveProjectIdFromStorage] = useState<string | null>(null);
  const projectIdFromPath = useMemo(() => projectIdFromAppPathname(pathname), [pathname]);
  /** UUID for DB/API: URL or storage when in project routes; in legacy mode use DEFAULT_PROJECT_ID (projectContext.projectName is a display name, not a UUID). */
  const effectiveProjectId =
    urlProjectId ??
    projectIdFromPath ??
    activeProjectIdFromStorage ??
    (projectContext ? DEFAULT_PROJECT_ID : undefined);
  effectiveProjectIdRef.current = effectiveProjectId;

  const projectPerms = useProjectPermissions();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  useEffect(() => {
    if (!urlProjectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Simulation", end: null });
    return () => setPageHeaderExtras(null);
  }, [urlProjectId, setPageHeaderExtras]);
  const simulationReadOnly =
    Boolean(urlProjectId) &&
    (projectPerms == null || !projectPerms.canEditContent);

  const [reportingSnapshotRow, setReportingSnapshotRow] = useState<SimulationSnapshotRow>(null);
  const reportingDbRow = reportingSnapshotRow as SimulationSnapshotRowDb | null;
  const [setReportingModalOpen, setSetReportingModalOpen] = useState(false);
  const [reportingNote, setReportingNote] = useState("");
  const [reportingMonthYear, setReportingMonthYear] = useState(() => toMonthYearKey(new Date()));
  const [setReportingSaving, setSetReportingSaving] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);

  const reportingMonthYearOptions = useMemo(() => getReportingMonthYearOptions(), []);

  useEffect(() => {
    if (invalidRunnableCount === 0) setRunBlockedInvalidCount(null);
  }, [invalidRunnableCount]);

  useEffect(() => {
    if (simulationReadOnly && process.env.NODE_ENV === "development") {
      console.log("[project-access] simulation UI read-only", { projectId: urlProjectId });
    }
  }, [simulationReadOnly, urlProjectId]);

  useEffect(() => {
    const supabase = supabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          setTriggeredBy(null);
          return;
        }
        const profile = await fetchPublicProfile(supabase, user.id);
        setTriggeredBy(formatTriggeredByLabel(user, profile));
      })
      .catch(() => setTriggeredBy(null));
  }, []);
  const setupRedirectPath = urlProjectId ? riskaiPath(`/projects/${urlProjectId}`) : DASHBOARD_PATH;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setActiveProjectIdFromStorage(window.localStorage.getItem(ACTIVE_PROJECT_KEY));
    } catch {
      // localStorage unavailable (e.g. private browsing)
    }
  }, []);

  // Gate: redirect to setup only in legacy mode (no urlProjectId). When accessing via URL, global context is not required.
  useEffect(() => {
    const ctx = loadProjectContext();
    setProjectContext(ctx);
    setGateChecked(true);
  }, []);
  useEffect(() => {
    if (!gateChecked) return;
    if (urlProjectId) return;
    if (!isProjectContextComplete(projectContext)) {
      router.replace(setupRedirectPath);
      return;
    }
  }, [gateChecked, projectContext, router, setupRedirectPath, urlProjectId]);

  // When project changes: clear store, then load risks + snapshot for this project. Only show results if snapshot exists for this project.
  useEffect(() => {
    if (!gateChecked) return;
    if (!isProjectContextComplete(projectContext) && !urlProjectId) return;
    if (!effectiveProjectId) return;
    const projectIdWeAreLoading = effectiveProjectId;
    const projectSwitched = lastSimulationBootstrapProjectId !== projectIdWeAreLoading;
    if (projectSwitched) {
      lastSimulationBootstrapProjectId = projectIdWeAreLoading;
      setLastRun(null);
      setSnapshotForProject(null);
      clearRef.current();
    } else {
      const sim = simulationRef.current;
      const cur = sim.current;
      const hasPersistedDbRun = !!(cur?.id && !cur.id.startsWith("sim_"));
      const hasNeutralRun = (sim.neutral?.iterationCount ?? 0) > 0;
      if (hasPersistedDbRun || hasNeutralRun) {
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot: true });
        if (cur?.timestampIso) setLastRun(cur.timestampIso);
      } else {
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot: false });
      }
    }
    listRisks(projectIdWeAreLoading)
      .then((loaded) => {
        if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
        setRisksRef.current(loaded);
      })
      .catch((err) => console.error("[simulation] load risks", err));
    getLatestSnapshot(projectIdWeAreLoading)
      .then((snapshot) => {
        if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
        const hasSnapshot = !!(snapshot?.created_at);
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot });
        if (hasSnapshot && snapshot) {
          setLastRun(snapshot.created_at ?? null);
          hydrateRef.current(snapshot);
        }
      })
      .catch((err) => {
        if (effectiveProjectIdRef.current !== projectIdWeAreLoading) return;
        setSnapshotForProject({ projectId: projectIdWeAreLoading, hasSnapshot: false });
        console.error("[simulation] load snapshot", err);
      });
  }, [gateChecked, projectContext, urlProjectId, effectiveProjectId]);

  const isCurrentRunPersisted = simulation.current?.id && !simulation.current.id.startsWith("sim_");
  const persistedRunId = simulation.current?.id;
  useEffect(() => {
    if (!effectiveProjectId || !persistedRunId || persistedRunId.startsWith("sim_")) return;
    getLatestSnapshot(effectiveProjectId)
      .then((row) => {
        if (row?.id === persistedRunId) setReportingSnapshotRow(row);
        else setReportingSnapshotRow(null);
      })
      .catch(() => setReportingSnapshotRow(null));
  }, [effectiveProjectId, persistedRunId]);

  const analysisState = useMemo(
    () => ({ risks, simulation: { ...simulation } }),
    [risks, simulation]
  );

  const neutralSummary = useMemo(() => getNeutralSummary(analysisState), [analysisState]);
  const costSamples = useMemo(() => getNeutralSamples(analysisState), [analysisState]);
  const timeSamples = useMemo(() => getNeutralTimeSamples(analysisState), [analysisState]);
  const timeSummary = useMemo(() => getNeutralTimeSummary(analysisState), [analysisState]);

  const iterationCount = simulation.neutral?.iterationCount ?? 0;
  const snapshotRisks = simulation.current?.risks ?? EMPTY_SNAPSHOT_RISKS;

  const hasData = neutralSummary != null;
  /** Only show results when we've loaded for this project and it has a snapshot; else show Run simulation. Legacy: no effectiveProjectId but hasSnapshot. */
  const currentProjectHasSnapshot =
    (snapshotForProject?.projectId === effectiveProjectId && snapshotForProject?.hasSnapshot) ||
    (effectiveProjectId == null && (snapshotForProject?.hasSnapshot ?? false));
  const showResults = currentProjectHasSnapshot && hasData;
  const showRunOnly =
    (snapshotForProject?.projectId === effectiveProjectId && !snapshotForProject?.hasSnapshot) ||
    (effectiveProjectId == null && !(snapshotForProject?.hasSnapshot ?? false));
  const loadingSnapshot = effectiveProjectId != null && snapshotForProject?.projectId !== effectiveProjectId;

  // Prefer project-specific context for display; fall back to gate (global) context
  const displayContext = useMemo(
    () => loadProjectContext(effectiveProjectId ?? null) ?? projectContext,
    [effectiveProjectId, projectContext]
  );

  const baseline: SimulationSectionBaseline | null = useMemo(() => {
    const targetPNumeric = displayContext
      ? riskAppetiteToPercent(displayContext.riskAppetite)
      : 80;
    const targetPLabel = displayContext?.riskAppetite ?? "P80";
    return {
      targetPNumeric,
      targetPLabel,
      approvedValue: 0,
    };
  }, [displayContext]);

  const costCdf = useMemo((): CostCdfPoint[] | null => {
    if (!hasData) return null;
    if (costSamples != null && costSamples.length > 0) {
      const dist = binSamplesIntoHistogram(costSamples, DISTRIBUTION_BIN_COUNT);
      return distributionToCostCdf(dist);
    }
    if (neutralSummary) {
      const dist = deriveCostHistogramFromPercentiles(
        {
          p20Cost: neutralSummary.p20Cost,
          p50Cost: neutralSummary.p50Cost,
          p80Cost: neutralSummary.p80Cost,
          p90Cost: neutralSummary.p90Cost,
        },
        DISTRIBUTION_BIN_COUNT
      );
      return distributionToCostCdf(dist);
    }
    return null;
  }, [hasData, costSamples, neutralSummary]);

  const timeCdf = useMemo((): TimeCdfPoint[] | null => {
    if (!timeSummary) return null;
    if (timeSamples != null && timeSamples.length > 0) {
      const dist = binSamplesIntoTimeHistogram(timeSamples, DISTRIBUTION_BIN_COUNT);
      return distributionToTimeCdf(dist);
    }
    const dist = deriveTimeHistogramFromPercentiles(timeSummary, DISTRIBUTION_BIN_COUNT);
    return distributionToTimeCdf(dist);
  }, [timeSummary, timeSamples]);

  const approvedBudgetBase = useMemo(() => {
    if (!displayContext) return null;
    return displayContext.approvedBudget_m * 1e6;
  }, [displayContext]);

  const plannedDurationDays = useMemo(() => {
    if (!displayContext) return null;
    return (displayContext.plannedDuration_months * 365) / 12;
  }, [displayContext]);

  const contingencyDays = useMemo(() => {
    if (!displayContext?.scheduleContingency_weeks) return null;
    return displayContext.scheduleContingency_weeks * 7;
  }, [displayContext]);

  const costBaseline: SimulationSectionBaseline | null = useMemo(() => {
    if (!baseline) return null;
    return { ...baseline, approvedValue: approvedBudgetBase ?? 0 };
  }, [baseline, approvedBudgetBase]);

  const timeBaseline: SimulationSectionBaseline | null = useMemo(() => {
    if (!baseline) return null;
    return { ...baseline, approvedValue: plannedDurationDays ?? 0 };
  }, [baseline, plannedDurationDays]);

  const costResults: CostResults = useMemo(
    () => ({
      samples: costSamples ?? null,
      summary: neutralSummary
        ? {
            p20Cost: neutralSummary.p20Cost,
            p50Cost: neutralSummary.p50Cost,
            p80Cost: neutralSummary.p80Cost,
            p90Cost: neutralSummary.p90Cost,
          }
        : null,
      iterationCount,
      risks: snapshotRisks,
    }),
    [costSamples, neutralSummary, iterationCount, snapshotRisks]
  );

  const timeResults: TimeResults = useMemo(
    () => ({
      samples: timeSamples ?? null,
      summary: timeSummary,
      iterationCount,
      risks: snapshotRisks,
    }),
    [timeSamples, timeSummary, iterationCount, snapshotRisks]
  );

  return (
    <main className="p-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">Simulation</h2>
          <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={async () => {
            if (simulationReadOnly) return;
            try {
              const result = await runSimulation(10000, effectiveProjectId ?? undefined);
              if (!result.ran && result.blockReason === "invalid") {
                setRunBlockedInvalidCount(result.invalidCount);
                return;
              }
              if (result.ran) {
                const now = new Date().toISOString();
                setLastRun(now);
                setSnapshotForProject({
                  projectId: effectiveProjectId ?? "legacy",
                  hasSnapshot: true,
                });
              }
            } catch {
              // Snapshot insert failed; do not update timestamp
            }
          }}
          disabled={simulationReadOnly || hasDraftRisks || invalidRunnableCount > 0}
          variant="secondary"
        >
          Run Simulation
        </Button>
        <Button
          type="button"
          onClick={() => clearSimulationHistory()}
          disabled={simulationReadOnly}
          variant="secondary"
        >
          Clear History
        </Button>
        {showResults &&
          isCurrentRunPersisted &&
          effectiveProjectId &&
          !reportingDbRow?.locked_for_reporting && (
          <Button
            type="button"
            onClick={() => !simulationReadOnly && setSetReportingModalOpen(true)}
            disabled={simulationReadOnly}
            variant="secondary"
          >
            Set as reporting version
          </Button>
        )}
        </div>
      </div>
      </div>
      {hasDraftRisks && (
        <Callout status="warning" className="mt-2 text-right" role="status">
          Review and save all draft risks in the Risk Register before running simulation.
        </Callout>
      )}
      {invalidRunnableCount > 0 && (
        <Callout status="warning" className="mt-2 text-right" role="status">
          Fix {invalidRunnableCount} risk{invalidRunnableCount !== 1 ? "s" : ""} to run simulation.
        </Callout>
      )}
      {runBlockedInvalidCount != null && runBlockedInvalidCount > 0 && (
        <Callout status="warning" className="mt-2 font-medium" role="alert">
          Simulation blocked: fix {runBlockedInvalidCount} risk{runBlockedInvalidCount !== 1 ? "s" : ""} to run simulation.
        </Callout>
      )}
      {simulationReadOnly && (
        <Callout status="info" className="mt-2" role="status">
          View-only access: you cannot run or change simulations for this project.
        </Callout>
      )}

      {loadingSnapshot && (
        <Card variant="inset" className="mt-0 p-6" aria-busy="true" aria-live="polite">
          <div className="mx-auto max-w-md animate-pulse space-y-3">
            <div className="mx-auto h-4 w-3/4 max-w-sm rounded bg-[var(--ds-surface-muted)]" />
            <div className="mx-auto h-4 w-1/2 max-w-xs rounded bg-[var(--ds-surface-muted)]" />
            <div className="mx-auto h-4 w-2/3 max-w-56 rounded bg-[var(--ds-surface-muted)]" />
          </div>
          <span className="sr-only">Loading simulation data</span>
        </Card>
      )}

      {showRunOnly && (
        <Card variant="inset" className="mt-0 p-6 text-center">
          <p className="m-0 font-medium text-[var(--ds-text-primary)]">
            No simulation run for this project yet. Run a simulation to see results.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={async () => {
                if (simulationReadOnly) return;
                try {
                  const result = await runSimulation(10000, effectiveProjectId ?? undefined);
                  if (!result.ran && result.blockReason === "invalid") {
                    setRunBlockedInvalidCount(result.invalidCount);
                    return;
                  }
                  if (result.ran) {
                    const now = new Date().toISOString();
                    setLastRun(now);
                    setSnapshotForProject({
                      projectId: effectiveProjectId ?? "legacy",
                      hasSnapshot: true,
                    });
                  }
                } catch {
                  // Snapshot insert failed; do not update timestamp
                }
              }}
              disabled={simulationReadOnly || hasDraftRisks || invalidRunnableCount > 0}
              variant="secondary"
            >
              Run simulation
            </Button>
            {effectiveProjectId && (
              <Link
                href={riskaiPath(`/projects/${effectiveProjectId}/run-data`)}
                className={linkSecondaryClassName}
              >
                Go to Run Data
              </Link>
            )}
          </div>
        </Card>
      )}

      {showResults && (
        <>
          {/* Baseline — compact row with header */}
          <section className="mt-0 overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]">
            <div className="bg-[var(--ds-surface-elevated)] py-3">
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <MetricTile
                  label="Base value"
                  value={formatDash(displayContext?.projectValue_m, (m) => formatMoneyMillions(m))}
                  helper="Base value"
                />
                <MetricTile
                  label="Contingency Value ($)"
                  value={formatDash(displayContext?.contingencyValue_m, (m) => formatMoneyMillions(m))}
                  helper="Contingency budget"
                />
                <MetricTile
                  label="Duration"
                  value={formatDash(plannedDurationDays, formatDurationDays)}
                  helper="Planned schedule duration"
                />
                <MetricTile
                  label="Contingency Value (Days)"
                  value={contingencyDays != null ? `${Math.round(contingencyDays)} days` : "—"}
                  helper="Schedule contingency"
                />
                <MetricTile
                  label="Target P-Value"
                  value={displayContext?.riskAppetite ?? "—"}
                  helper="Risk appetite percentile"
                />
              </div>
            </div>
          </section>

          {/* Group 2 & 3 — Cost (left) and Schedule (right) side by side */}
          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {costBaseline && (
              <SimulationSection
                title="Cost Simulation"
                mode="cost"
                baseline={costBaseline}
                results={costResults}
                costCdf={costCdf}
                formatCostValue={displayContext ? (dollars) => formatMoneyMillions(dollars / 1e6) : undefined}
                contingencyValueDollars={displayContext ? displayContext.contingencyValue_m * 1e6 : undefined}
                settingsHref={effectiveProjectId ? riskaiPath(`/projects/${effectiveProjectId}/settings`) : undefined}
              />
            )}
            {timeBaseline && (
              <SimulationSection
                title="Schedule Simulation"
                mode="time"
                baseline={timeBaseline}
                results={timeResults}
                timeCdf={timeCdf}
                settingsHref={effectiveProjectId ? riskaiPath(`/projects/${effectiveProjectId}/settings`) : undefined}
              />
            )}
          </section>
        </>
      )}

      {currentProjectHasSnapshot && lastRun && (
        <footer className="mt-8 border-t border-[var(--ds-border)] pt-4">
          <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
            Last simulation run: {new Date(lastRun).toLocaleString()}
          </p>
        </footer>
      )}

      {setReportingModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="set-reporting-version-dialog-title"
          onClick={(e) => e.target === e.currentTarget && (setSetReportingModalOpen(false), setReportingNote(""), setReportingMonthYear(toMonthYearKey(new Date())))}
        >
          <div
            style={{ width: "90vw", maxWidth: 400 }}
            className="flex shrink-0 flex-col overflow-hidden rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] shadow-[var(--ds-shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--ds-border)] px-4 py-3 sm:px-6">
              <h2 id="set-reporting-version-dialog-title" className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
                Set as reporting version
              </h2>
              <button
                type="button"
                onClick={() => { setSetReportingModalOpen(false); setReportingNote(""); setReportingMonthYear(toMonthYearKey(new Date())); }}
                className="rounded-[var(--ds-radius-md)] border border-transparent p-2 text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <div>
                <Label htmlFor="reporting-month-year-select" className="mb-1 block">
                  Reporting month / year
                </Label>
                <select
                  id="reporting-month-year-select"
                  value={reportingMonthYear}
                  onChange={(e) => setReportingMonthYear(e.target.value)}
                  className="w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                >
                  {reportingMonthYearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-0.5 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Locked once confirmed</p>
              </div>
              <div className="space-y-1.5 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2.5 text-[length:var(--ds-text-sm)]">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Reporting version</span>
                  <span className="font-medium text-[var(--ds-text-muted)]">Yes</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Reporting month / year</span>
                  <span className="text-[var(--ds-text-muted)]">{formatReportingMonthYear(reportingMonthYear)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Locked by</span>
                  <span className="truncate text-[var(--ds-text-muted)]">{triggeredBy ?? "Not available"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ds-text-muted)]">Locked on</span>
                  <span className="text-[var(--ds-text-muted)]">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 text-[var(--ds-text-muted)]">Reporting note</span>
                  <span className="min-w-0 text-right text-[var(--ds-text-muted)]">
                    {reportingNote.trim() || "—"}
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="reporting-note-input-sim" className="mb-1 block">
                  Reporting note
                </Label>
                <Textarea
                  id="reporting-note-input-sim"
                  placeholder="Why is this the reporting version?"
                  value={reportingNote}
                  onChange={(e) => setReportingNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--ds-border)] px-4 py-4 sm:px-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setSetReportingModalOpen(false); setReportingNote(""); setReportingMonthYear(toMonthYearKey(new Date())); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={setReportingSaving}
                onClick={async () => {
                  const snapshotId = simulation.current?.id;
                  if (!snapshotId || !effectiveProjectId) return;
                  setSetReportingSaving(true);
                  try {
                    const supabase = supabaseBrowserClient();
                    const {
                      data: { user },
                      error: authErr,
                    } = await supabase.auth.getUser();
                    if (authErr) {
                      console.error("[simulation] set reporting version auth", authErr);
                      throw authErr;
                    }
                    const userId = user?.id;
                    if (!userId) {
                      const err = new Error("Not authenticated: cannot set reporting version.");
                      console.error("[simulation] set reporting version", err);
                      throw err;
                    }

                    await setSnapshotAsReportingVersion(snapshotId, {
                      userId,
                      note: reportingNote,
                      reportingMonthYear,
                      projectId: effectiveProjectId,
                    });
                    const row = await getLatestSnapshot(effectiveProjectId);
                    if (row?.id === snapshotId) setReportingSnapshotRow(row);
                    setSetReportingModalOpen(false);
                    setReportingNote("");
                    setReportingMonthYear(toMonthYearKey(new Date()));
                  } catch (e) {
                    console.error("[simulation] set reporting version failed", e);
                    throw e;
                  } finally {
                    setSetReportingSaving(false);
                  }
                }}
                variant="primary"
              >
                {setReportingSaving ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
