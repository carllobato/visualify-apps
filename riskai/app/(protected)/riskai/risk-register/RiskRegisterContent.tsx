"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { distinctOwnerNamesFromRisks } from "@/components/risk-register/RiskProjectOwnersContext";
import {
  getCurrentRiskRatingLetter,
  getCurrentRiskRatingScoreForSort,
  getCurrentRiskRatingTitle,
  isCurrentRiskRatingNA,
  isRiskStatusArchived,
  RISK_STATUS_ARCHIVED_LOOKUP,
} from "@/domain/risk/riskFieldSemantics";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { useProjectPermissions } from "@/contexts/ProjectPermissionsContext";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import {
  Button,
  Card,
  CardBody,
  CardContent,
  Callout,
  FieldError,
  Input,
} from "@visualify/design-system";
import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";
const FOCUS_HIGHLIGHT_CLASS = "risk-focus-highlight";
const HIGHLIGHT_DURATION_MS = 2000;

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
    case "currentRating":
      return getCurrentRiskRatingLetter(risk);
    case "status":
      return risk.status;
    default:
      return "";
  }
}

function applyColumnFilters<T>(list: T[], filters: ColumnFilters, getValue: (item: T, col: SortColumn) => string): T[] {
  let result = list;
  for (const col of Object.keys(filters) as SortColumn[]) {
    if (col === "riskId") continue;
    const values = filters[col];
    if (!values?.length) continue;
    const set = new Set(values);
    result = result.filter((item) => set.has(getValue(item, col)));
  }
  return result;
}

function pushSearchToken(tokens: string[], value: unknown) {
  if (value == null) return;
  if (typeof value === "string") {
    const t = value.trim();
    if (t) tokens.push(t);
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    tokens.push(String(value));
    return;
  }
  if (typeof value === "boolean") {
    tokens.push(value ? "true" : "false");
  }
}

/** Lowercased concatenation of searchable risk fields for global register search. */
function buildRiskSearchText(risk: Risk): string {
  const tokens: string[] = [];
  pushSearchToken(tokens, risk.id);
  if (risk.riskNumber != null) {
    pushSearchToken(tokens, risk.riskNumber);
    pushSearchToken(tokens, String(risk.riskNumber).padStart(3, "0"));
  }
  pushSearchToken(tokens, risk.title);
  pushSearchToken(tokens, risk.description);
  pushSearchToken(tokens, risk.category);
  pushSearchToken(tokens, risk.status);
  pushSearchToken(tokens, risk.owner);
  pushSearchToken(tokens, risk.mitigation);
  pushSearchToken(tokens, risk.contingency);
  pushSearchToken(tokens, risk.appliesTo);
  pushSearchToken(tokens, risk.dueDate);
  pushSearchToken(tokens, risk.createdAt);
  pushSearchToken(tokens, risk.updatedAt);
  pushSearchToken(tokens, risk.aiMergeClusterId);

  // Rating: only the register column semantics (not raw inherent vs residual), so e.g. "high" does not
  // match a mitigated row that shows M while inherentRating.level is still "high".
  pushSearchToken(tokens, getCurrentRiskRatingLetter(risk));
  pushSearchToken(tokens, getCurrentRiskRatingTitle(risk));

  const numericFields = [
    risk.preMitigationCostMin,
    risk.preMitigationCostML,
    risk.preMitigationCostMax,
    risk.preMitigationTimeMin,
    risk.preMitigationTimeML,
    risk.preMitigationTimeMax,
    risk.mitigationCost,
    risk.postMitigationCostMin,
    risk.postMitigationCostML,
    risk.postMitigationCostMax,
    risk.postMitigationTimeMin,
    risk.postMitigationTimeML,
    risk.postMitigationTimeMax,
    risk.probability,
    risk.escalationPersistence,
    risk.sensitivity,
    risk.mitigationStrength,
  ];
  for (const n of numericFields) pushSearchToken(tokens, n);

  if (risk.mergedFromRiskIds?.length) {
    for (const id of risk.mergedFromRiskIds) pushSearchToken(tokens, id);
  }

  if (risk.timeProfile != null) {
    if (Array.isArray(risk.timeProfile)) {
      for (const w of risk.timeProfile) pushSearchToken(tokens, w);
    } else {
      pushSearchToken(tokens, risk.timeProfile);
    }
  }

  const mp = risk.mitigationProfile;
  if (mp) {
    pushSearchToken(tokens, mp.status);
    pushSearchToken(tokens, mp.effectiveness);
    pushSearchToken(tokens, mp.confidence);
    pushSearchToken(tokens, mp.reduces);
    pushSearchToken(tokens, mp.lagMonths);
  }

  if (risk.scoreHistory?.length) {
    for (const h of risk.scoreHistory) {
      pushSearchToken(tokens, h.timestamp);
      pushSearchToken(tokens, h.compositeScore);
    }
  }

  return tokens.join(" ").toLowerCase();
}

/**
 * Substring match on the lowercased haystack (single- and multi-token), so partial words match titles,
 * descriptions, etc. Multi-word queries match as a contiguous phrase.
 */
function registerSearchHaystackMatchesQuery(haystack: string, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return true;
  return haystack.includes(q);
}

function riskMatchesRegisterSearch(risk: Risk, rawQuery: string): boolean {
  return registerSearchHaystackMatchesQuery(buildRiskSearchText(risk), rawQuery);
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

/** Tighter top padding under the shell page header; avoids stacking with a large margin below an empty in-page header row. */
const RISK_REGISTER_MAIN_CLASS = "min-w-0 px-6 pb-6 pt-3 text-[var(--ds-text-primary)]";

/** Stable JSON for “persisted vs local” comparison (sorted risk ids, sorted keys, drop volatile fields). */
function risksToPersistSnapshot(risks: Risk[]): string {
  const exclude = new Set(["updatedAt", "createdAt", "lastMitigationUpdate", "scoreHistory"]);
  function sortKeys(obj: unknown): unknown {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    const rec = obj as Record<string, unknown>;
    const keys = Object.keys(rec).filter((k) => !exclude.has(k)).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = sortKeys(rec[k]);
    return out;
  }
  const sorted = [...risks].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(sorted.map((r) => sortKeys(r as Record<string, unknown>)));
}

export function RiskRegisterContent({ projectId: urlProjectId }: RiskRegisterContentProps = {}) {
  const { risks, simulation, addRisk, updateRisk, setRisks, restoreArchivedRisk } =
    useRiskRegister();
  const [saveToServerLoading, setSaveToServerLoading] = useState(false);
  const [saveToServerError, setSaveToServerError] = useState<string | null>(null);
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);
  const [aiClusters, setAiClusters] = useState<RiskMergeCluster[]>([]);
  const [aiReviewSkippedIds, setAiReviewSkippedIds] = useState<Set<string>>(new Set());
  const [tableSortState, setTableSortState] = useState<TableSortState>({
    column: "riskId",
    direction: "asc",
  });
  const [projectContext, setProjectContext] = useState<ReturnType<typeof loadProjectContext>>(null);
  const [gateChecked, setGateChecked] = useState(false);
  const [showAddRiskModal, setShowAddRiskModal] = useState(false);
  const [showAddNewRiskChoiceModal, setShowAddNewRiskChoiceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInitialRiskId, setDetailInitialRiskId] = useState<string | null>(null);
  const [showCreateRiskFileModal, setShowCreateRiskFileModal] = useState(false);
  const [showCreateRiskAIModal, setShowCreateRiskAIModal] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [registerSearchQuery, setRegisterSearchQuery] = useState("");
  const [risksLoadError, setRisksLoadError] = useState<string | null>(null);
  const [risksLoading, setRisksLoading] = useState(true);
  const [loadRetryKey, setLoadRetryKey] = useState(0);
  const [lastPersistedRisksSnapshot, setLastPersistedRisksSnapshot] = useState<string | null>(null);
  const [navLeaveTarget, setNavLeaveTarget] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusRiskId = searchParams.get("focusRiskId");
  const highlightTimeoutRef = useRef<number | null>(null);
  const hasHydratedFromDbRef = useRef(false);
  const projectIdForHydrateRef = useRef<string | null>(null);

  const setupRedirectPath = urlProjectId ? riskaiPath(`/projects/${urlProjectId}`) : DASHBOARD_PATH;
  /** Trimmed project UUID from the URL; empty when missing — do not load or save risks without it. */
  const projectIdTrimmed = urlProjectId?.trim() ?? "";

  const projectPermissions = useProjectPermissions();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const contentReadOnly =
    Boolean(urlProjectId) &&
    (projectPermissions == null || !projectPermissions.canEditContent);

  useEffect(() => {
    setLastPersistedRisksSnapshot(null);
  }, [projectIdTrimmed]);

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
        setLastPersistedRisksSnapshot(risksToPersistSnapshot(loaded));
        setRisksLoadError(null);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setRisksLoadError(msg);
        setRisks([]);
        setLastPersistedRisksSnapshot(null);
        if (process.env.NODE_ENV === "development") {
          console.error("[risks] listRisks failed", err);
        }
      })
      .finally(() => setRisksLoading(false));
  }, [urlProjectId, setRisks, loadRetryKey]);

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

  const persistRisksToServer = useCallback(async (): Promise<boolean> => {
    const pid = urlProjectId?.trim();
    if (!pid) {
      console.error("[risk-register] replaceRisks skipped: projectId is required for risk access");
      return false;
    }
    setSaveToServerLoading(true);
    setSaveToServerError(null);
    try {
      const saved = await replaceRisks(risks, pid);
      const merged = mergeServerRisksWithLocal(saved, risks, true);
      setRisks(merged);
      setLastPersistedRisksSnapshot(risksToPersistSnapshot(merged));
      return true;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === "string"
            ? (err as { message: string }).message
            : String(err);
      setSaveToServerError(msg);
      console.error("[risks]", err);
      return false;
    } finally {
      setSaveToServerLoading(false);
    }
  }, [risks, setRisks, urlProjectId, mergeServerRisksWithLocal]);

  const handleSaveToServer = useCallback(() => {
    void persistRisksToServer();
  }, [persistRisksToServer]);

  const currentRisksPersistSnapshot = useMemo(() => risksToPersistSnapshot(risks), [risks]);
  const extraOwnerNamesFromRisks = useMemo(() => distinctOwnerNamesFromRisks(risks), [risks]);
  const registerHasUnsavedServerChanges =
    !contentReadOnly &&
    lastPersistedRisksSnapshot !== null &&
    currentRisksPersistSnapshot !== lastPersistedRisksSnapshot;

  useEffect(() => {
    if (contentReadOnly || !registerHasUnsavedServerChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [contentReadOnly, registerHasUnsavedServerChanges]);

  useEffect(() => {
    if (contentReadOnly || !registerHasUnsavedServerChanges) return;
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#") || hrefAttr.startsWith("mailto:") || hrefAttr.startsWith("tel:"))
        return;
      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}`;
      const here = `${window.location.pathname}${window.location.search}`;
      if (next === here) return;
      e.preventDefault();
      e.stopPropagation();
      setNavLeaveTarget(next + url.hash);
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [contentReadOnly, registerHasUnsavedServerChanges]);

  const dismissNavLeaveDialog = useCallback(() => setNavLeaveTarget(null), []);

  const confirmLeaveWithoutSaving = useCallback(() => {
    const href = navLeaveTarget;
    setNavLeaveTarget(null);
    if (href) router.push(href);
  }, [navLeaveTarget, router]);

  const confirmLeaveAfterSave = useCallback(async () => {
    const href = navLeaveTarget;
    if (!href) return;
    const ok = await persistRisksToServer();
    if (ok) {
      setNavLeaveTarget(null);
      router.push(href);
    }
  }, [navLeaveTarget, persistRisksToServer, router]);

  const leaveRegisterConfirmPortal =
    navLeaveTarget && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="risk-register-leave-title"
            onClick={dismissNavLeaveDialog}
          >
            <Card
              variant="elevated"
              className="max-w-sm w-full shadow-[var(--ds-shadow-md)]"
              onClick={(e) => e.stopPropagation()}
            >
              <CardContent className="flex flex-col gap-3">
                <p
                  id="risk-register-leave-title"
                  className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]"
                >
                  You have unsaved changes to the risk register. Save before leaving?
                </p>
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button type="button" variant="secondary" size="md" onClick={dismissNavLeaveDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={confirmLeaveWithoutSaving}
                    disabled={saveToServerLoading}
                  >
                    Don&apos;t save
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => void confirmLeaveAfterSave()}
                    disabled={saveToServerLoading}
                    aria-busy={saveToServerLoading}
                  >
                    {saveToServerLoading ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>,
          document.body
        )
      : null;

  const state = useMemo(() => ({ simulation }), [simulation]);
  const decisionById = useMemo(() => selectDecisionByRiskId(state), [state]);
  const scoreDeltaByRiskId = useMemo(() => selectDecisionScoreDelta(state), [state]);

  const { filteredRisks, risksForFilterOptions } = useMemo(() => {
    const risksForFilterOptions = risks;
    let list = risks;

    const statusFilterValues = columnFilters.status;
    const statusFilterIncludesArchived =
      statusFilterValues != null &&
      statusFilterValues.some((v) => isRiskStatusArchived(v));

    if (!statusFilterIncludesArchived) {
      list = list.filter((r) => !isRiskStatusArchived(r.status));
    }

    list = applyColumnFilters(list, columnFilters, getRiskColumnValue);
    list = list.filter((r) => riskMatchesRegisterSearch(r, registerSearchQuery));

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
          case "currentRating": {
            const naA = isCurrentRiskRatingNA(a);
            const naB = isCurrentRiskRatingNA(b);
            if (naA !== naB) {
              cmp = naA ? 1 : -1;
              break;
            }
            if (naA) {
              cmp = 0;
              break;
            }
            const sa = getCurrentRiskRatingScoreForSort(a)!;
            const sb = getCurrentRiskRatingScoreForSort(b)!;
            cmp = sa - sb;
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
  }, [risks, columnFilters, tableSortState, registerSearchQuery]);

  // When opening the detail modal for a newly added risk, it may not be in filteredRisks (e.g. "Show flagged only").
  // Ensure the initial risk is included so the modal shows the correct risk instead of defaulting to the first filtered one.
  const risksForDetailModal = useMemo(() => {
    if (!detailInitialRiskId) return filteredRisks;
    if (filteredRisks.some((r) => r.id === detailInitialRiskId)) return filteredRisks;
    const initialRisk = risks.find((r) => r.id === detailInitialRiskId);
    if (!initialRisk) return filteredRisks;
    return [initialRisk, ...filteredRisks];
  }, [filteredRisks, detailInitialRiskId, risks]);

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
      // Archive the risks that were merged (keep for completeness, do not delete)
      for (const id of cluster.riskIds) {
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

  const riskRegisterPageHeaderEnd = useMemo(() => {
    if (contentReadOnly) return null;
    const saveDisabled = saveToServerLoading || !registerHasUnsavedServerChanges;
    return (
      <div className="flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSaveToServer}
          disabled={saveDisabled}
          title={saveDisabled && !saveToServerLoading ? "No changes to save" : undefined}
        >
          {saveToServerLoading ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddNewRiskChoiceModal(true)}>
          Generate AI Risk
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleAiReviewClick} disabled={aiReviewLoading}>
          AI Review
        </Button>
      </div>
    );
  }, [
    aiReviewLoading,
    contentReadOnly,
    handleAiReviewClick,
    handleSaveToServer,
    registerHasUnsavedServerChanges,
    saveToServerLoading,
  ]);

  useEffect(() => {
    if (!urlProjectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Risk Register", end: riskRegisterPageHeaderEnd });
    return () => setPageHeaderExtras(null);
  }, [urlProjectId, setPageHeaderExtras, riskRegisterPageHeaderEnd]);

  // Show loading until gate is checked and a project id is present (risks are never loaded without it).
  const blockContent = !gateChecked || !projectIdTrimmed;
  /** Skip bottom margin when the in-page header row is empty (normal edit mode) so the search bar sits closer to the shell header. */
  const registerHeaderBlockClass = contentReadOnly || saveToServerError ? "mb-3" : undefined;

  if (blockContent) {
    return (
      <RiskRegisterLookupProviders
        projectId={projectIdTrimmed}
        extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}
      >
        <NeutralRiskaiLoading variant="main" srLabel="Loading risk register" />
      </RiskRegisterLookupProviders>
    );
  }

  if (risksLoading) {
    return (
      <RiskRegisterLookupProviders
        projectId={projectIdTrimmed}
        extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}
      >
        <>
          <main className={RISK_REGISTER_MAIN_CLASS}>
            <div className="mb-4">
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
            <NeutralRiskaiLoading variant="content" srLabel="Loading risks" />
          </main>
          {leaveRegisterConfirmPortal}
        </>
      </RiskRegisterLookupProviders>
    );
  }

  if (risksLoadError) {
    return (
      <RiskRegisterLookupProviders
        projectId={projectIdTrimmed}
        extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}
      >
        <>
          <main className={RISK_REGISTER_MAIN_CLASS}>
            <div className="mb-4">
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
          {leaveRegisterConfirmPortal}
        </>
      </RiskRegisterLookupProviders>
    );
  }

  return (
    <RiskRegisterLookupProviders
      projectId={projectIdTrimmed}
      extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}
    >
    <>
    <main className={RISK_REGISTER_MAIN_CLASS}>
      <div className={registerHeaderBlockClass}>
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
          <div className="w-full min-w-0">
            <Input
              type="search"
              value={registerSearchQuery}
              onChange={(e) => setRegisterSearchQuery(e.target.value)}
              placeholder="Search risks (title, ID, description, owner, status, ratings, costs…)"
              aria-label="Search risks across all fields"
              className="w-full min-w-0"
              autoComplete="off"
            />
          </div>
          <RiskRegisterTable
            risks={filteredRisks}
            risksForFilterOptions={risksForFilterOptions}
            emptyListMessage={
              risks.length > 0 && filteredRisks.length === 0
                ? "No risks match your search or column filters. Archived risks stay hidden unless you include Archived in the Status filter."
                : undefined
            }
            decisionById={decisionById}
            scoreDeltaByRiskId={scoreDeltaByRiskId}
            onRiskClick={(risk) => {
              setDetailInitialRiskId(risk.id);
              setShowDetailModal(true);
            }}
            onAddNewClick={!contentReadOnly ? () => setShowAddNewRiskChoiceModal(true) : undefined}
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
            key={`${showDetailModal}-${detailInitialRiskId ?? ""}`}
            open={showDetailModal}
            risks={risksForDetailModal}
            initialRiskId={detailInitialRiskId}
            readOnly={contentReadOnly}
            onClose={() => {
              setShowDetailModal(false);
              setDetailInitialRiskId(null);
            }}
            onSave={(risk) => updateRisk(risk.id, risk)}
            onRestoreRisk={!contentReadOnly ? (id) => restoreArchivedRisk(id) : undefined}
            onAddNew={
              contentReadOnly
                ? undefined
                : () => {
                    setShowDetailModal(false);
                    setDetailInitialRiskId(null);
                    setShowAddRiskModal(true);
                  }
            }
            onAddNewWithFile={
              contentReadOnly
                ? undefined
                : () => {
                    setShowDetailModal(false);
                    setDetailInitialRiskId(null);
                    setShowCreateRiskFileModal(true);
                  }
            }
            onAddNewWithAI={
              contentReadOnly
                ? undefined
                : () => {
                    setShowDetailModal(false);
                    setDetailInitialRiskId(null);
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
        onGenerateWithText={() => {
          setShowAddNewRiskChoiceModal(false);
          setShowCreateRiskAIModal(true);
        }}
        onGenerateWithFile={() => {
          setShowAddNewRiskChoiceModal(false);
          setShowCreateRiskFileModal(true);
        }}
      />
      <CreateRiskFileModal
        open={showCreateRiskFileModal}
        onClose={() => setShowCreateRiskFileModal(false)}
        onRisksImported={(riskIds) => {
          setColumnFilters({});
          if (riskIds.length > 0) {
            setDetailInitialRiskId(riskIds[0]);
            setShowDetailModal(true);
          }
        }}
      />
      <CreateRiskAIModal
        open={showCreateRiskAIModal}
        onClose={() => setShowCreateRiskAIModal(false)}
        projectId={projectIdTrimmed || null}
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
    {leaveRegisterConfirmPortal}
    </>
    </RiskRegisterLookupProviders>
  );
}
