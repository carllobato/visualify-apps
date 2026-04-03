"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRiskRegister } from "@/store/risk-register.store";
import { selectDecisionByRiskId, selectDecisionScoreDelta } from "@/store/selectors";
import {
  loadProjectContext,
  isProjectContextComplete,
  parseProjectContext,
  type ProjectContext,
} from "@/lib/projectContext";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { listRisks, replaceRisks } from "@/lib/db/risks";
import type { Risk } from "@/domain/risk/risk.schema";
import { mergeDraftToRisk } from "@/domain/risk/risk.mapper";
import type { RiskMergeCluster, MergeRiskDraft } from "@/domain/risk/risk-merge.types";
import { RiskRegisterHeader } from "@/components/risk-register/RiskRegisterHeader";
import {
  RiskRegisterTable,
  type SortColumn,
  type TableSortState,
  type ColumnFilters,
} from "@/components/risk-register/RiskRegisterTable";
import { AddRiskModal } from "@/components/risk-register/AddRiskModal";
import { RiskDetailModal } from "@/components/risk-register/RiskDetailModal";
import { CreateRiskFileModal } from "@/components/risk-register/CreateRiskFileModal";
import { CreateRiskAIModal } from "@/components/risk-register/CreateRiskAIModal";
import { AddNewRiskChoiceModal } from "@/components/risk-register/AddNewRiskChoiceModal";
import { AIReviewDrawer } from "@/components/risk-register/AIReviewDrawer";
import { RiskRegisterLookupProviders } from "@/components/risk-register/RiskRegisterLookupProviders";
import { isRiskStatusArchived, RISK_STATUS_ARCHIVED_LOOKUP } from "@/domain/risk/riskFieldSemantics";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { useProjectPermissions } from "@/contexts/ProjectPermissionsContext";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import {
  Button,
  Card,
  CardBody,
  Callout,
  FieldError,
  Tab,
  Tabs,
} from "@visualify/design-system";
import { LoadingPlaceholder, LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";
const FOCUS_HIGHLIGHT_CLASS = "risk-focus-highlight";
const HIGHLIGHT_DURATION_MS = 2000;

const LEVEL_LETTER: Record<string, string> = { low: "L", medium: "M", high: "H", extreme: "E" };
function getRiskColumnValue(risk: Risk, column: SortColumn): string {
  switch (column) {
    case "riskId":
      return risk.riskNumber != null ? String(risk.riskNumber).padStart(3, "0") : "";
    case "title":
      return risk.title?.trim() ?? "";
    case "category":
      return risk.category;
    case "owner":
      return risk.owner ?? "—";
    case "appliesTo":
      return risk.appliesTo?.trim() ? risk.appliesTo.trim() : "—";
    case "preRating":
      return LEVEL_LETTER[risk.inherentRating.level] ?? "L";
    case "postRating":
      return risk.mitigation?.trim() ? (LEVEL_LETTER[risk.residualRating.level] ?? "L") : "N/A";
    case "mitigationMovement": {
      const pre = risk.inherentRating.score;
      const post = risk.residualRating.score;
      if (post > pre) return "↑";
      if (post < pre) return "↓";
      return "→";
    }
    case "status":
      return risk.status;
    default:
      return "";
  }
}

function applyColumnFilters<T>(list: T[], filters: ColumnFilters, getValue: (item: T, col: SortColumn) => string): T[] {
  let result = list;
  for (const col of Object.keys(filters) as SortColumn[]) {
    const values = filters[col];
    if (!values?.length) continue;
    const set = new Set(values);
    result = result.filter((item) => set.has(getValue(item, col)));
  }
  return result;
}

/** Map DB `target_completion_date` to `YYYY-MM-DD` for project context parsing. */
function targetCompletionDateFromDb(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return "";
}

function projectContextFromSettingsRow(row: Record<string, unknown>): ProjectContext | null {
  const raw = {
    projectName: typeof row.project_name === "string" ? row.project_name : "",
    location:
      row.location !== undefined && row.location !== null && typeof row.location === "string"
        ? row.location.trim()
        : undefined,
    plannedDuration_months: row.planned_duration_months,
    targetCompletionDate: targetCompletionDateFromDb(row.target_completion_date),
    scheduleContingency_weeks: row.schedule_contingency_weeks,
    riskAppetite: row.risk_appetite,
    currency: row.currency,
    financialUnit: row.financial_unit,
    projectValue_input: row.project_value_input,
    contingencyValue_input: row.contingency_value_input,
  };
  return parseProjectContext(raw);
}

export type RiskRegisterContentProps = { projectId?: string | null };

export function RiskRegisterContent({ projectId: urlProjectId }: RiskRegisterContentProps = {}) {
  const { risks, simulation, addRisk, updateRisk, setRisks, archiveRisk, closeRisk, restoreArchivedRisk, clearRisks } =
    useRiskRegister();
  const [saveToServerLoading, setSaveToServerLoading] = useState(false);
  const [saveToServerError, setSaveToServerError] = useState<string | null>(null);
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [aiClusters, setAiClusters] = useState<RiskMergeCluster[]>([]);
  const [aiReviewSkippedIds, setAiReviewSkippedIds] = useState<Set<string>>(new Set());
  const [tableSortState, setTableSortState] = useState<TableSortState>(null);
  const [projectContext, setProjectContext] = useState<ReturnType<typeof loadProjectContext>>(null);
  const [gateChecked, setGateChecked] = useState(false);
  const [showAddRiskModal, setShowAddRiskModal] = useState(false);
  const [showAddNewRiskChoiceModal, setShowAddNewRiskChoiceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInitialRiskId, setDetailInitialRiskId] = useState<string | null>(null);
  const [showCreateRiskFileModal, setShowCreateRiskFileModal] = useState(false);
  const [showCreateRiskAIModal, setShowCreateRiskAIModal] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [registerView, setRegisterView] = useState<"active" | "archived">("active");
  const [risksLoadError, setRisksLoadError] = useState<string | null>(null);
  const [risksLoading, setRisksLoading] = useState(true);
  const [loadRetryKey, setLoadRetryKey] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusRiskId = searchParams.get("focusRiskId");
  const highlightTimeoutRef = useRef<number | null>(null);
  const prevRisksLengthRef = useRef(risks.length);
  const hasHydratedFromDbRef = useRef(false);
  const projectIdForHydrateRef = useRef<string | null>(null);

  const setupRedirectPath = urlProjectId ? riskaiPath(`/projects/${urlProjectId}`) : DASHBOARD_PATH;
  /** Trimmed project UUID from the URL; empty when missing — do not load or save risks without it. */
  const projectIdTrimmed = urlProjectId?.trim() ?? "";

  const projectPermissions = useProjectPermissions();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  useEffect(() => {
    if (!urlProjectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Risk Register", end: null });
    return () => setPageHeaderExtras(null);
  }, [urlProjectId, setPageHeaderExtras]);
  const contentReadOnly =
    Boolean(urlProjectId) &&
    (projectPermissions == null || !projectPermissions.canEditContent);

  useEffect(() => {
    if (contentReadOnly && urlProjectId && process.env.NODE_ENV === "development") {
      console.log("[project-access] risk register read-only UI", { projectId: urlProjectId });
    }
  }, [contentReadOnly, urlProjectId]);

  // Gate: load project context for gate/display. Project routes: Supabase first, then project-scoped localStorage; legacy: global localStorage only.
  useEffect(() => {
    const trimmed = urlProjectId?.trim();
    if (!trimmed) {
      const ctx = loadProjectContext(urlProjectId ?? undefined);
      setProjectContext(ctx);
      setGateChecked(true);
      return;
    }

    let cancelled = false;
    setGateChecked(false);
    void (async () => {
      const supabase = supabaseBrowserClient();
      const { data: row, error } = await supabase
        .from("visualify_project_settings")
        .select("*")
        .eq("project_id", trimmed)
        .maybeSingle();
      if (cancelled) return;
      let next: ProjectContext | null = null;
      if (!error && row && typeof row === "object") {
        const parsed = projectContextFromSettingsRow(row as Record<string, unknown>);
        if (parsed) next = parsed;
      }
      if (next == null) {
        next = loadProjectContext(trimmed);
      }
      if (!cancelled) {
        setProjectContext(next);
        setGateChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlProjectId]);
  useEffect(() => {
    if (!gateChecked) return;
    if (urlProjectId) return;
    if (!isProjectContextComplete(projectContext)) {
      router.replace(setupRedirectPath);
      return;
    }
  }, [gateChecked, projectContext, router, setupRedirectPath, urlProjectId]);

  // Hydrate risk store from Supabase only on initial mount or when projectId changes.
  // No fallback to local/example data: on failure show error and clear risks.
  useEffect(() => {
    const pid = urlProjectId?.trim();
    if (!pid) {
      console.error("[risk-register] listRisks skipped: projectId is required for risk access");
      setRisks([]);
      setRisksLoadError(null);
      setRisksLoading(false);
      return;
    }
    if (pid !== projectIdForHydrateRef.current) {
      projectIdForHydrateRef.current = pid;
      hasHydratedFromDbRef.current = false;
    }
    if (hasHydratedFromDbRef.current && loadRetryKey === 0) return;
    if (loadRetryKey > 0) hasHydratedFromDbRef.current = false;
    hasHydratedFromDbRef.current = true;
    setRisksLoading(true);
    setRisksLoadError(null);
    listRisks(pid)
      .then((loaded) => {
        setRisks(loaded);
        setRisksLoadError(null);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setRisksLoadError(msg);
        setRisks([]);
        if (process.env.NODE_ENV === "development") {
          console.error("[risks] listRisks failed", err);
        }
      })
      .finally(() => setRisksLoading(false));
  }, [urlProjectId, setRisks, loadRetryKey]);

  // Log when risk list grows (after add/append) for debugging visibility of new risks (dev only)
  useEffect(() => {
    if (risks.length > prevRisksLengthRef.current && process.env.NODE_ENV === "development") {
      console.log("[risk-ui] after add", {
        total: risks.length,
        ids: risks.map((r) => r.id ?? (r as Risk & { tempId?: string }).tempId).slice(-5),
      });
    }
    prevRisksLengthRef.current = risks.length;
  }, [risks]);

  /** Merge server-returned risks with current local risks: prefer server values so DB-populated data is not overwritten; only use local when server value is missing (e.g. legacy DB without extended columns). When matchByIndex is true (e.g. right after replaceRisks), pairs by array index so newly saved risks with temp IDs that got real UUIDs still get local fallbacks. Otherwise matches by id only. */
  const mergeServerRisksWithLocal = useCallback(
    (serverRisks: Risk[], localRisks: Risk[], matchByIndex?: boolean): Risk[] => {
      const preferServer = <T,>(serverVal: T, localVal: T): T =>
        serverVal !== undefined && serverVal !== null ? serverVal : localVal;
      const applyLocalOverrides = (server: Risk, local: Risk): Risk => ({
        ...server,
        riskNumber: preferServer(server.riskNumber, local.riskNumber),
        appliesTo: preferServer(server.appliesTo, local.appliesTo),
        preMitigationCostMin: preferServer(server.preMitigationCostMin, local.preMitigationCostMin),
        preMitigationCostML: preferServer(server.preMitigationCostML, local.preMitigationCostML),
        preMitigationCostMax: preferServer(server.preMitigationCostMax, local.preMitigationCostMax),
        preMitigationTimeMin: preferServer(server.preMitigationTimeMin, local.preMitigationTimeMin),
        preMitigationTimeML: preferServer(server.preMitigationTimeML, local.preMitigationTimeML),
        preMitigationTimeMax: preferServer(server.preMitigationTimeMax, local.preMitigationTimeMax),
        postMitigationCostMin: preferServer(server.postMitigationCostMin, local.postMitigationCostMin),
        postMitigationCostML: preferServer(server.postMitigationCostML, local.postMitigationCostML),
        postMitigationCostMax: preferServer(server.postMitigationCostMax, local.postMitigationCostMax),
        postMitigationTimeMin: preferServer(server.postMitigationTimeMin, local.postMitigationTimeMin),
        postMitigationTimeML: preferServer(server.postMitigationTimeML, local.postMitigationTimeML),
        postMitigationTimeMax: preferServer(server.postMitigationTimeMax, local.postMitigationTimeMax),
        probability: preferServer(server.probability, local.probability),
      });
      if (matchByIndex && serverRisks.length === localRisks.length) {
        return serverRisks.map((serverRisk, i) =>
          applyLocalOverrides(serverRisk, localRisks[i]!)
        );
      }
      return serverRisks.map((serverRisk) => {
        const localById = localRisks.find((r) => r.id === serverRisk.id);
        if (localById) return applyLocalOverrides(serverRisk, localById);
        return serverRisk;
      });
    },
    []
  );

  const handleSaveToServer = useCallback(async () => {
    const pid = urlProjectId?.trim();
    if (!pid) {
      console.error("[risk-register] replaceRisks skipped: projectId is required for risk access");
      return;
    }
    setSaveToServerLoading(true);
    setSaveToServerError(null);
    try {
      const saved = await replaceRisks(risks, pid);
      setRisks(mergeServerRisksWithLocal(saved, risks, true));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === "string"
            ? (err as { message: string }).message
            : String(err);
      setSaveToServerError(msg);
      console.error("[risks]", err);
    } finally {
      setSaveToServerLoading(false);
    }
  }, [risks, setRisks, urlProjectId, mergeServerRisksWithLocal]);

  const state = useMemo(() => ({ simulation }), [simulation]);
  const decisionById = useMemo(() => selectDecisionByRiskId(state), [state]);
  const scoreDeltaByRiskId = useMemo(() => selectDecisionScoreDelta(state), [state]);

  const { filteredRisks, risksForFilterOptions } = useMemo(() => {
    const baseList =
      registerView === "active"
        ? risks.filter((r) => !isRiskStatusArchived(r.status))
        : risks.filter((r) => isRiskStatusArchived(r.status));

    if (registerView === "active") {
      console.log("[risk-ui] active register excludes archived", {
        totalInStore: risks.length,
        activeVisibleBeforeColumnFilters: baseList.length,
      });
    }

    let list = baseList;
    const risksForFilterOptions = list;
    list = applyColumnFilters(list, columnFilters, getRiskColumnValue);

    if (tableSortState) {
      const { column, direction } = tableSortState;
      const mult = direction === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        let cmp = 0;
        switch (column) {
          case "riskId":
            cmp = (a.riskNumber ?? 0) - (b.riskNumber ?? 0);
            break;
          case "title":
            cmp = (a.title || "").localeCompare(b.title || "");
            break;
          case "category":
            cmp = (a.category || "").localeCompare(b.category || "");
            break;
          case "owner":
            cmp = (a.owner ?? "").localeCompare(b.owner ?? "");
            break;
          case "appliesTo":
            cmp = (a.appliesTo ?? "").localeCompare(b.appliesTo ?? "");
            break;
          case "preRating":
            cmp = a.inherentRating.score - b.inherentRating.score;
            break;
          case "postRating":
            cmp = a.residualRating.score - b.residualRating.score;
            break;
          case "mitigationMovement": {
            const deltaA = a.residualRating.score - a.inherentRating.score;
            const deltaB = b.residualRating.score - b.inherentRating.score;
            cmp = deltaA - deltaB;
            break;
          }
          case "status":
            cmp = (a.status || "").localeCompare(b.status || "");
            break;
          default:
            break;
        }
        return mult * cmp;
      });
    }
    return { filteredRisks: list, risksForFilterOptions };
  }, [risks, columnFilters, tableSortState, registerView]);

  if (process.env.NODE_ENV === "development") {
    console.log("[risk-ui] render", {
      total: risks.length,
      visible: filteredRisks.length,
      filterState: columnFilters,
    });
  }

  // When opening the detail modal for a newly added risk, it may not be in filteredRisks (e.g. "Show flagged only").
  // Ensure the initial risk is included so the modal shows the correct risk instead of defaulting to the first filtered one.
  const risksForDetailModal = useMemo(() => {
    const inView = (r: Risk) =>
      registerView === "active" ? !isRiskStatusArchived(r.status) : isRiskStatusArchived(r.status);
    if (!detailInitialRiskId) return filteredRisks;
    if (filteredRisks.some((r) => r.id === detailInitialRiskId)) return filteredRisks;
    const initialRisk = risks.find((r) => r.id === detailInitialRiskId);
    if (!initialRisk || !inView(initialRisk)) return filteredRisks;
    return [initialRisk, ...filteredRisks];
  }, [filteredRisks, detailInitialRiskId, risks, registerView]);

  useEffect(() => {
    if (!focusRiskId) return;
    const el = document.getElementById(`risk-${focusRiskId}`);
    if (!el) return;

    const delayId = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(FOCUS_HIGHLIGHT_CLASS);
      highlightTimeoutRef.current = window.setTimeout(() => {
        el.classList.remove(FOCUS_HIGHLIGHT_CLASS);
        highlightTimeoutRef.current = null;
        router.replace(urlProjectId ? riskaiPath(`/projects/${urlProjectId}/risks`) : DASHBOARD_PATH, {
          scroll: false,
        });
      }, HIGHLIGHT_DURATION_MS);
    }, 100);

    return () => {
      clearTimeout(delayId);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
      el.classList.remove(FOCUS_HIGHLIGHT_CLASS);
    };
  }, [focusRiskId, router, urlProjectId]);

  const handleAiReviewClick = useCallback(async () => {
    if (contentReadOnly) return;
    const projectIdForApi = urlProjectId?.trim();
    if (!projectIdForApi) {
      console.error("[risk-register] AI review skipped: projectId is required for risk access");
      return;
    }
    setAiReviewOpen(true);
    setAiReviewError(null);
    setAiClusters([]);
    setAiReviewSkippedIds(new Set());
    setAiReviewLoading(true);
    try {
      const payload = {
        projectId: projectIdForApi,
        risks: risks.filter((r) => !isRiskStatusArchived(r.status)),
      };
      const res = await fetch("/api/ai/risk-merge-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = typeof data?.error === "string" ? data.error : "AI review failed";
        const details = data?.details as Array<{ path?: string; message?: string }> | undefined;
        if (Array.isArray(details) && details.length > 0) {
          const parts = details.slice(0, 5).map((d) => (d.path ? `${d.path}: ${d.message ?? ""}` : d.message ?? ""));
          if (parts.some(Boolean)) msg += " — " + parts.filter(Boolean).join("; ");
        }
        setAiReviewError(msg);
        setAiClusters([]);
        return;
      }
      setAiClusters(Array.isArray(data.clusters) ? data.clusters : []);
    } catch (e) {
      setAiReviewError(e instanceof Error ? e.message : "Request failed");
      setAiClusters([]);
    } finally {
      setAiReviewLoading(false);
    }
  }, [contentReadOnly, urlProjectId, risks]);

  const handleAcceptMerge = useCallback(
    (cluster: RiskMergeCluster, draft: MergeRiskDraft) => {
      if (contentReadOnly) return;
      // Create merged result as a new risk (new id, next riskNumber) to avoid losing information
      const newRisk = mergeDraftToRisk(draft, {
        mergedFromRiskIds: cluster.riskIds,
        aiMergeClusterId: cluster.clusterId,
      });
      console.log("[risk lookup] selected status on save", newRisk.status);
      console.log("[risk lookup] selected applies_to on save", newRisk.appliesTo);
      // Archive the risks that were merged (keep for completeness, do not delete)
      for (const id of cluster.riskIds) {
        console.log("[risks] archived (merge accept)", { riskId: id, status: RISK_STATUS_ARCHIVED_LOOKUP });
        updateRisk(id, { status: RISK_STATUS_ARCHIVED_LOOKUP });
      }
      addRisk(newRisk);
      setAiClusters((prev) => prev.filter((c) => c.clusterId !== cluster.clusterId));
    },
    [addRisk, contentReadOnly, updateRisk]
  );

  const handleSkipCluster = useCallback((clusterId: string) => {
    setAiReviewSkippedIds((prev) => new Set([...prev, clusterId]));
  }, []);

  const handleRetryLoad = useCallback(() => {
    setRisksLoadError(null);
    setLoadRetryKey((k) => k + 1);
  }, []);

  // Show loading until gate is checked and a project id is present (risks are never loaded without it).
  const blockContent = !gateChecked || !projectIdTrimmed;

  if (blockContent) {
    return (
      <RiskRegisterLookupProviders projectId={projectIdTrimmed}>
        <main className="p-6">
          <LoadingPlaceholderCompact label="Loading risk register" />
        </main>
      </RiskRegisterLookupProviders>
    );
  }

  if (risksLoading) {
    return (
      <RiskRegisterLookupProviders projectId={projectIdTrimmed}>
      <main className="p-6 text-[var(--ds-text-primary)]">
        <div className="mb-6">
          <RiskRegisterHeader
            projectContext={projectContext}
            readOnlyContent={contentReadOnly}
            onAiReviewClick={contentReadOnly ? undefined : handleAiReviewClick}
            aiReviewLoading={aiReviewLoading}
            onGenerateAiRiskClick={
              contentReadOnly ? undefined : () => setShowAddNewRiskChoiceModal(true)
            }
            onSaveToServer={contentReadOnly ? undefined : handleSaveToServer}
            saveToServerLoading={saveToServerLoading}
          />
        </div>
        <LoadingPlaceholder />
      </main>
      </RiskRegisterLookupProviders>
    );
  }

  if (risksLoadError) {
    return (
      <RiskRegisterLookupProviders projectId={projectIdTrimmed}>
      <main className="p-6 text-[var(--ds-text-primary)]">
        <div className="mb-6">
          <RiskRegisterHeader
            projectContext={projectContext}
            readOnlyContent={contentReadOnly}
            onAiReviewClick={contentReadOnly ? undefined : handleAiReviewClick}
            aiReviewLoading={aiReviewLoading}
            onGenerateAiRiskClick={
              contentReadOnly ? undefined : () => setShowAddNewRiskChoiceModal(true)
            }
            onSaveToServer={contentReadOnly ? undefined : handleSaveToServer}
            saveToServerLoading={saveToServerLoading}
          />
        </div>
        <Callout status="danger" role="alert">
          <p className="m-0 text-[length:var(--ds-text-sm)] font-medium">Failed to load risks</p>
          <p className="mt-1 m-0 text-[length:var(--ds-text-sm)]">{risksLoadError}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleRetryLoad}>
            Retry
          </Button>
        </Callout>
      </main>
      </RiskRegisterLookupProviders>
    );
  }

  return (
    <RiskRegisterLookupProviders projectId={projectIdTrimmed}>
    <main className="p-6 text-[var(--ds-text-primary)]">
      <div className="mb-6">
        <RiskRegisterHeader
          projectContext={projectContext}
          readOnlyContent={contentReadOnly}
          onAiReviewClick={contentReadOnly ? undefined : handleAiReviewClick}
          aiReviewLoading={aiReviewLoading}
          onGenerateAiRiskClick={
            contentReadOnly ? undefined : () => setShowAddNewRiskChoiceModal(true)
          }
          onSaveToServer={contentReadOnly ? undefined : handleSaveToServer}
          saveToServerLoading={saveToServerLoading}
        />
        {saveToServerError && (
          <FieldError className="mt-2">Save failed: {saveToServerError}</FieldError>
        )}
      </div>
      {risks.length === 0 ? (
        <Card variant="inset" className="text-center">
          <CardBody className="py-8">
            <p className="m-0 font-medium text-[var(--ds-text-primary)]">No risks in this project</p>
            <p className="m-0 mt-1 text-center text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
              {contentReadOnly
                ? "You have view-only access to this project."
                : "Add a risk manually, from file, or with AI to get started."}
            </p>
            {!contentReadOnly && (
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => setShowAddNewRiskChoiceModal(true)}
              >
                Add risk
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-3">
            <Tabs aria-label="Risk register view" className="flex-wrap">
              <Tab
                active={registerView === "active"}
                onClick={() => {
                  setRegisterView("active");
                  setColumnFilters({});
                }}
              >
                Active register
              </Tab>
              <Tab
                active={registerView === "archived"}
                onClick={() => {
                  setRegisterView("archived");
                  setColumnFilters({});
                }}
              >
                Archived
              </Tab>
            </Tabs>
            {!contentReadOnly && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveToServer()}
                  disabled={saveToServerLoading}
                >
                  {saveToServerLoading ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddNewRiskChoiceModal(true)}>
                  Generate AI Risk
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleAiReviewClick} disabled={aiReviewLoading}>
                  AI Review
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearRisks}>
                  Clear
                </Button>
              </div>
            )}
          </div>
          {registerView === "active" &&
            risks.length > 0 &&
            risks.every((r) => isRiskStatusArchived(r.status)) && (
              <p className="mb-3 m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                All risks are archived. Open the <strong className="font-semibold text-[var(--ds-text-primary)]">Archived</strong> tab to review or restore them.
              </p>
            )}
          {registerView === "archived" && !risks.some((r) => isRiskStatusArchived(r.status)) && (
            <p className="mb-3 m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">No archived risks.</p>
          )}
          <RiskRegisterTable
            risks={filteredRisks}
            risksForFilterOptions={risksForFilterOptions}
            decisionById={decisionById}
            scoreDeltaByRiskId={scoreDeltaByRiskId}
            onRiskClick={(risk) => {
              setDetailInitialRiskId(risk.id);
              setShowDetailModal(true);
            }}
            onArchivedRestore={
              registerView === "archived" && !contentReadOnly
                ? (risk) => {
                    restoreArchivedRisk(risk.id);
                  }
                : undefined
            }
            onAddNewClick={
              registerView === "active" && !contentReadOnly
                ? () => setShowAddNewRiskChoiceModal(true)
                : undefined
            }
            sortState={tableSortState}
            onSortByColumn={(column: SortColumn) => {
              setTableSortState((prev) => {
                if (prev?.column === column) {
                  return prev.direction === "asc"
                    ? { column, direction: "desc" as const }
                    : null;
                }
                return { column, direction: "asc" as const };
              });
            }}
            columnFilters={columnFilters}
            onColumnFilterChange={(column, values) => {
              setColumnFilters((prev) => ({
                ...prev,
                [column]: values.length > 0 ? values : undefined,
              }));
            }}
          />
          <RiskDetailModal
            open={showDetailModal}
            risks={risksForDetailModal}
            initialRiskId={detailInitialRiskId}
            readOnly={contentReadOnly}
            onClose={() => setShowDetailModal(false)}
            onSave={(risk) => updateRisk(risk.id, risk)}
            onArchiveRisk={
              registerView === "active" && !contentReadOnly ? (id) => archiveRisk(id) : undefined
            }
            onCloseRisk={
              registerView === "active" && !contentReadOnly ? (id) => closeRisk(id) : undefined
            }
            onRestoreRisk={
              registerView === "archived" && !contentReadOnly
                ? (id) => restoreArchivedRisk(id)
                : undefined
            }
            onAddNew={
              contentReadOnly
                ? undefined
                : () => {
                    setShowDetailModal(false);
                    setShowAddRiskModal(true);
                  }
            }
            onAddNewWithFile={
              contentReadOnly
                ? undefined
                : () => {
                    setShowDetailModal(false);
                    setShowCreateRiskFileModal(true);
                  }
            }
            onAddNewWithAI={
              contentReadOnly
                ? undefined
                : () => {
                    setShowDetailModal(false);
                    setShowAddNewRiskChoiceModal(true);
                  }
            }
          />
        </>
      )}
      <AddNewRiskChoiceModal
        open={showAddNewRiskChoiceModal}
        onClose={() => setShowAddNewRiskChoiceModal(false)}
        onAddManualRisk={() => {
          setShowAddNewRiskChoiceModal(false);
          setShowAddRiskModal(true);
        }}
        onRisksAdded={(riskIds) => {
          setColumnFilters({});
          setShowAddNewRiskChoiceModal(false);
          if (riskIds.length > 0) {
            setDetailInitialRiskId(riskIds[0]);
            setShowDetailModal(true);
          }
        }}
      />
      <CreateRiskFileModal
        open={showCreateRiskFileModal}
        onClose={() => setShowCreateRiskFileModal(false)}
      />
      <CreateRiskAIModal
        open={showCreateRiskAIModal}
        onClose={() => setShowCreateRiskAIModal(false)}
      />
      <AddRiskModal
        open={showAddRiskModal}
        onClose={() => setShowAddRiskModal(false)}
        onAdd={(risk) => {
          addRisk(risk);
          setShowAddRiskModal(false);
        }}
      />
      <AIReviewDrawer
        open={aiReviewOpen}
        onClose={() => setAiReviewOpen(false)}
        loading={aiReviewLoading}
        error={aiReviewError}
        clusters={aiClusters.filter((c) => !aiReviewSkippedIds.has(c.clusterId))}
        risks={risks}
        onAcceptMerge={handleAcceptMerge}
        onSkipCluster={handleSkipCluster}
      />
    </main>
    </RiskRegisterLookupProviders>
  );
}
