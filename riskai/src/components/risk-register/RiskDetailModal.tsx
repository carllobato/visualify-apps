"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Risk, RiskStatus, AppliesTo, MitigationMode } from "@/domain/risk/risk.schema";
import { formatRiskRegisterNumberOrId } from "@/domain/risk/riskRegisterDisplay";
import { mergeMitigationProfileForMode, mitigationModeFromRisk, modellingInputProfileFromMode, mitigationModeFromInputProfile } from "@/domain/risk/mitigationMode";
import type { ModellingInputProfile } from "@/domain/risk/mitigationMode";
import {
  buildRating,
  probabilityPctToScale,
  consequenceScaleFromAppliesTo,
} from "@/domain/risk/risk.logic";
import {
  appliesToAffectsCost,
  appliesToAffectsTime,
  findRiskStatusNameByKeys,
  isRiskStatusArchived,
  isRiskStatusClosed,
  isRiskStatusDraft,
  normalizeAppliesToKey,
  RISK_STATUS_DRAFT_LOOKUP,
  displayedMitigationModeAfterStatusChange,
} from "@/domain/risk/riskFieldSemantics";
import { dlog } from "@/lib/debug";
import { getRiskValidationErrors } from "@/domain/risk/runnable-risk.validator";
import {
  getRiskRegisterRequiredIndicators,
  getRiskRegisterSaveValidationErrors,
  riskRegisterHasMitigationOrPostData,
  shouldShowRiskRegisterMitigationFields,
} from "@/domain/risk/riskRegisterSaveValidation";
import { nowIso } from "@/lib/time";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Input,
  Label,
  Textarea,
} from "@visualify/design-system";
import { useRiskProjectOwners } from "./RiskProjectOwnersContext";
import { useRiskCategoryOptions } from "./RiskCategoryOptionsContext";
import {
  RiskCategoryPicker,
  getResolvedCategoryPickerValue,
  shouldPersistNewCategoryOnSubmit,
} from "./RiskCategoryPicker";
import { RiskStatusSelect } from "./RiskStatusSelect";
import {
  RiskOwnerPicker,
  getResolvedOwnerPickerValue,
  shouldPersistNewOwnerOnSubmit,
} from "./RiskOwnerPicker";
import { useRiskStatusOptions } from "./RiskStatusOptionsContext";

const rangeTrackClass =
  "col-span-2 min-w-0 h-2 rounded-[var(--ds-radius-sm)] appearance-none bg-[var(--ds-surface-muted)] accent-[var(--ds-primary)]";

function RequiredStar() {
  return <span className="text-[var(--ds-status-danger-fg)]" aria-label="required">*</span>;
}

function formatCostDisplay(value: string): string {
  const trimmed = value.trim().replace(/,/g, "");
  if (trimmed === "") return "";
  const num = parseFloat(trimmed);
  return Number.isFinite(num) ? num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : value;
}
/** Preserves decimal point so values like 1500.50 are not turned into 150050. */
function parseCostInput(value: string): string {
  const allowed = value.replace(/[^\d.]/g, "");
  const firstDot = allowed.indexOf(".");
  if (firstDot === -1) return allowed;
  return allowed.slice(0, firstDot + 1) + allowed.slice(firstDot + 1).replace(/\./g, "");
}

/** Special id passed as initialRiskId to open the modal at the "Add new risk" slot. */
export const ADD_NEW_RISK_ID = "__add_new__";

/** Deterministic snapshot for dirty comparison: sorted keys (recursively), exclude volatile fields. Ensures nested objects (e.g. inherentRating) don't cause false dirty from key order. */
function toComparableSnapshot(risk: Record<string, unknown>): string {
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
  return JSON.stringify(sortKeys(risk));
}

export function RiskDetailModal({
  open,
  risks,
  initialRiskId,
  readOnly = false,
  onClose,
  onSave,
  onAddNew,
  onAddNewWithFile,
  onAddNewWithAI,
  onRestoreRisk,
}: {
  open: boolean;
  risks: Risk[];
  initialRiskId?: string | null;
  /** View-only: block edits and hide save/archive/generate actions. */
  readOnly?: boolean;
  onClose: () => void;
  onSave: (risk: Risk) => Risk | void | Promise<Risk | void>;
  onAddNew?: () => void;
  /** Open flow: Create Risk with AI File Uploader */
  onAddNewWithFile?: () => void;
  /** Open flow: Create Risk with AI (text entry) */
  onAddNewWithAI?: () => void;
  /** Restore archived risk to Draft. */
  onRestoreRisk?: (riskId: string) => void;
}) {
  const getInitialIndex = useCallback((): number => {
    if (initialRiskId === ADD_NEW_RISK_ID) return risks.length;
    if (!initialRiskId || risks.length === 0) return 0;
    const i = risks.findIndex((r) => r.id === initialRiskId);
    return i >= 0 ? i : 0;
  }, [initialRiskId, risks]);

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  // Header (risk ID is read-only model id; title is editable)
  const [title, setTitle] = useState("");
  // General
  const [description, setDescription] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryNewDraft, setCategoryNewDraft] = useState("");
  const { createProjectOwner } = useRiskProjectOwners();
  const { createRiskCategory } = useRiskCategoryOptions();
  const [ownerSelect, setOwnerSelect] = useState("");
  const [ownerNewDraft, setOwnerNewDraft] = useState("");
  const [status, setStatus] = useState<RiskStatus>("open");
  const [closureNote, setClosureNote] = useState("");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("both");
  const [mitigationMode, setMitigationMode] = useState<MitigationMode>("none");
  // Pre-Mitigation
  const [preMitigationProbabilityPct, setPreMitigationProbabilityPct] = useState("");
  const [preMitigationCostMin, setPreMitigationCostMin] = useState("");
  const [preMitigationCostML, setPreMitigationCostML] = useState("");
  const [preMitigationCostMax, setPreMitigationCostMax] = useState("");
  const [preMitigationTimeMin, setPreMitigationTimeMin] = useState("");
  const [preMitigationTimeML, setPreMitigationTimeML] = useState("");
  const [preMitigationTimeMax, setPreMitigationTimeMax] = useState("");
  // Mitigation
  const [mitigation, setMitigation] = useState("");
  const [mitigationCost, setMitigationCost] = useState("");
  // Post-Mitigation
  const [postMitigationProbabilityPct, setPostMitigationProbabilityPct] = useState("");
  const [postMitigationCostMin, setPostMitigationCostMin] = useState("");
  const [postMitigationCostML, setPostMitigationCostML] = useState("");
  const [postMitigationCostMax, setPostMitigationCostMax] = useState("");
  const [postMitigationTimeMin, setPostMitigationTimeMin] = useState("");
  const [postMitigationTimeML, setPostMitigationTimeML] = useState("");
  const [postMitigationTimeMax, setPostMitigationTimeMax] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const validationBlockRef = useRef<HTMLDivElement>(null);
  const pendingScrollValidationRef = useRef(false);
  const { statuses: riskStatusOptions } = useRiskStatusOptions();
  const modalRef = useRef<HTMLDivElement>(null);
  /** After a successful Save, store a snapshot so we treat the form as not dirty until the user edits or switches risk. */
  const lastSavedSnapshotRef = useRef<{ id: string; snapshot: string } | null>(null);
  const prevRiskIdRef = useRef<string | null>(null);
  /** Set when we've synced form from currentRisk; avoids false dirty before first sync (e.g. on open). */
  const lastSyncedRiskIdRef = useRef<string | null>(null);
  /** Baseline snapshot captured when we synced; compare form output to this so we're not sensitive to currentRisk reference or recomputation. */
  const lastSyncedBaselineRef = useRef<string | null>(null);

  const currentRisk = risks[currentIndex] ?? null;
  const isAddNewSlot = currentIndex === risks.length;
  const hasMultipleOrAddNew = risks.length >= 1 || isAddNewSlot;
  const hasAddNewSlot = !!(onAddNew ?? onAddNewWithFile ?? onAddNewWithAI);
  const isLast = risks.length > 0 && currentIndex === risks.length - 1;
  const isEmpty = risks.length === 0;

  const syncFormFromRisk = useCallback((risk: Risk) => {
    setTitle(risk.title);
    setDescription(risk.description ?? "");
    setCategorySelect(risk.category);
    setCategoryNewDraft("");
    setStatus(risk.status);
    setClosureNote(risk.closureNote ?? "");
    const rawOwner = risk.owner ?? "";
    const ownerVal = rawOwner === "Unassigned" ? "" : rawOwner.trim();
    setOwnerSelect(ownerVal);
    setOwnerNewDraft("");
    setAppliesTo(risk.appliesTo ?? "both");
    setMitigationMode(mitigationModeFromRisk(risk));
    setMitigation(risk.mitigation ?? "");
    setMitigationCost(risk.mitigationCost != null ? String(risk.mitigationCost) : "");
    // Blank/null stays blank in the form so save does not invent 0 or Probability 50.
    setPreMitigationProbabilityPct(
      risk.preMitigationProbabilityPct != null ? String(risk.preMitigationProbabilityPct) : ""
    );
    setPreMitigationCostMin(risk.preMitigationCostMin != null ? String(risk.preMitigationCostMin) : "");
    setPreMitigationCostML(risk.preMitigationCostML != null ? String(risk.preMitigationCostML) : "");
    setPreMitigationCostMax(risk.preMitigationCostMax != null ? String(risk.preMitigationCostMax) : "");
    setPreMitigationTimeMin(risk.preMitigationTimeMin != null ? String(risk.preMitigationTimeMin) : "");
    setPreMitigationTimeML(risk.preMitigationTimeML != null ? String(risk.preMitigationTimeML) : "");
    setPreMitigationTimeMax(risk.preMitigationTimeMax != null ? String(risk.preMitigationTimeMax) : "");
    // Always load mitigation/post form state so status/mode changes cannot erase planned values from the editor.
    setPostMitigationProbabilityPct(
      risk.postMitigationProbabilityPct != null ? String(risk.postMitigationProbabilityPct) : ""
    );
    setPostMitigationCostMin(
      risk.postMitigationCostMin != null ? String(risk.postMitigationCostMin) : ""
    );
    setPostMitigationCostML(
      risk.postMitigationCostML != null ? String(risk.postMitigationCostML) : ""
    );
    setPostMitigationCostMax(
      risk.postMitigationCostMax != null ? String(risk.postMitigationCostMax) : ""
    );
    setPostMitigationTimeMin(
      risk.postMitigationTimeMin != null ? String(risk.postMitigationTimeMin) : ""
    );
    setPostMitigationTimeML(
      risk.postMitigationTimeML != null ? String(risk.postMitigationTimeML) : ""
    );
    setPostMitigationTimeMax(
      risk.postMitigationTimeMax != null ? String(risk.postMitigationTimeMax) : ""
    );
  }, []);

  /** Normalize a risk the same way buildUpdatedRisk normalizes form output, so we can compare without false positives (e.g. "" vs undefined). Blank optional numerics stay undefined (not 0 / 50). Mitigation/post values always persist — mode must not clear them. */
  const normalizeRiskForComparison = useCallback((risk: Risk): Risk => {
    const mode = mitigationModeFromRisk(risk);
    const prePct = risk.preMitigationProbabilityPct;
    const preCostML = risk.preMitigationCostML;
    const preTimeML = risk.preMitigationTimeML;
    const postPct = risk.postMitigationProbabilityPct;
    const postCostML = risk.postMitigationCostML;
    const postTimeML = risk.postMitigationTimeML;
    const applies = risk.appliesTo ?? "both";
    const preP =
      prePct != null ? probabilityPctToScale(prePct) : risk.inherentRating.probability;
    const preC = consequenceScaleFromAppliesTo(applies, preCostML ?? 0, preTimeML ?? 0);
    const inherentRating = buildRating(preP, preC);
    const residualRating =
      postPct != null
        ? buildRating(
            probabilityPctToScale(postPct),
            consequenceScaleFromAppliesTo(applies, postCostML ?? 0, postTimeML ?? 0)
          )
        : risk.residualRating;
    return {
      ...risk,
      title: (risk.title ?? "").trim() || risk.title,
      description: risk.description?.trim() || undefined,
      category: risk.category,
      status: risk.status,
      owner: risk.owner?.trim() || undefined,
      appliesTo: applies,
      preMitigationCostMin: risk.preMitigationCostMin,
      preMitigationCostML: preCostML,
      preMitigationCostMax: risk.preMitigationCostMax,
      preMitigationTimeMin: risk.preMitigationTimeMin,
      preMitigationTimeML: preTimeML,
      preMitigationTimeMax: risk.preMitigationTimeMax,
      mitigation: risk.mitigation?.trim() || undefined,
      mitigationCost: risk.mitigationCost,
      postMitigationCostMin: risk.postMitigationCostMin,
      postMitigationCostML: postCostML,
      postMitigationCostMax: risk.postMitigationCostMax,
      postMitigationTimeMin: risk.postMitigationTimeMin,
      postMitigationTimeML: postTimeML,
      postMitigationTimeMax: risk.postMitigationTimeMax,
      inherentRating,
      residualRating,
      preMitigationProbabilityPct: prePct,
      postMitigationProbabilityPct: postPct,
      probability:
        mode !== "none" && postPct != null
          ? postPct / 100
          : prePct != null
            ? prePct / 100
            : undefined,
      mitigationProfile: mergeMitigationProfileForMode(risk, mode),
      updatedAt: "",
    };
  }, []);

  // Sync form from the current risk. Runs as useLayoutEffect so the form is populated before paint (no flash of empty fields on open or Prev/Next navigation). The parent's `key` prop forces a fresh mount for each open, so `currentIndex` starts correct via useState(getInitialIndex) and this effect syncs the form on mount. On Prev/Next, currentIndex changes → currentRisk changes → ref mismatch → re-syncs.
  useLayoutEffect(() => {
    if (!open || !currentRisk || currentIndex === risks.length) return;
    if (lastSyncedRiskIdRef.current !== currentRisk.id) {
      syncFormFromRisk(currentRisk);
      lastSyncedRiskIdRef.current = currentRisk.id;
      lastSyncedBaselineRef.current = toComparableSnapshot(
        normalizeRiskForComparison(currentRisk) as Record<string, unknown>
      );
    } else if (lastSyncedBaselineRef.current == null) {
      // Baseline missing after open / target change — without this, isDirty stays false forever.
      lastSyncedBaselineRef.current = toComparableSnapshot(
        normalizeRiskForComparison(currentRisk) as Record<string, unknown>
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentRisk?.id intentionally used instead of currentRisk to avoid re-runs on same-risk reference change
  }, [currentIndex, open, currentRisk?.id, risks.length, syncFormFromRisk, normalizeRiskForComparison]);

  // Clear "just saved" state when switching to a different risk so we don't suppress the dirty prompt for the wrong risk. Deps use currentRisk?.id so we only re-run when the viewed risk id changes, not on object reference change.
  useEffect(() => {
    if (!currentRisk) return;
    if (prevRiskIdRef.current != null && prevRiskIdRef.current !== currentRisk.id) {
      lastSavedSnapshotRef.current = null;
    }
    prevRiskIdRef.current = currentRisk.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on id only; currentRisk read from closure when effect runs
  }, [currentRisk?.id]);

  // Clear validation errors when switching risk or when modal opens
  useEffect(() => {
    if (open) setValidationErrors([]);
  }, [open, currentIndex]);

  // When filter narrows and current index is out of range, jump to first
  useEffect(() => {
    if (!open || risks.length === 0) return;
    if (currentIndex >= risks.length) setCurrentIndex(0);
  }, [open, risks.length, currentIndex]);

  // When risks array changes while modal is open (e.g. risksForDetailModal flips from [initialRisk, ...filtered] to filteredRisks),
  // keep showing the same risk by id instead of the same index, so we don't jump to a different risk.
  useEffect(() => {
    if (!open || risks.length === 0) return;
    if (currentIndex === risks.length) return; // on add-new slot
    const viewingId = lastSyncedRiskIdRef.current;
    if (!viewingId) return;
    const newIndex = risks.findIndex((r) => r.id === viewingId);
    if (newIndex >= 0) {
      setCurrentIndex(newIndex);
    } else {
      setCurrentIndex(0);
    }
  }, [open, risks, currentIndex]);

  useEffect(() => {
    if (!open || !modalRef.current) return;
    const el = modalRef.current;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    // Focus the dialog container so no field loads in edit mode
    el.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const target = e.target as HTMLElement;
      if (!el.contains(target)) return;
      if (e.shiftKey) {
        if (target === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (target === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [open, currentIndex]);

  /** Input profile only — never mutates canonical lifecycle status. */
  const handleInputProfileChange = useCallback(
    (profile: ModellingInputProfile) => {
      setMitigationMode((prev) =>
        mitigationModeFromInputProfile(profile, { status, previousMode: prev })
      );
    },
    [status]
  );

  /** Header status dropdown: reopen Closed → Draft; one-way display default for Mitigating → Post. */
  const handleLifecycleStatusChange = useCallback(
    (next: string) => {
      if (isRiskStatusClosed(status) && !isRiskStatusClosed(next)) {
        const draftName =
          findRiskStatusNameByKeys(riskStatusOptions, ["draft"]) ?? RISK_STATUS_DRAFT_LOOKUP;
        setStatus(draftName as RiskStatus);
        setMitigationMode("none");
        return;
      }
      setStatus(next as RiskStatus);
      if (isRiskStatusClosed(next) || isRiskStatusArchived(next)) return;
      setMitigationMode((prev) => displayedMitigationModeAfterStatusChange(next, prev));
    },
    [status, riskStatusOptions]
  );

  const parseNum = (s: string): number | undefined => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : undefined;
  };
  const parseIntNum = (s: string): number | undefined => {
    const v = parseInt(s, 10);
    return Number.isFinite(v) ? v : undefined;
  };

  /** Build the risk as it would be saved from current form state (for dirty check and save). Mitigation/post form values always persist — modelling mode must not clear them. Blank optional numerics stay undefined (null in DB); explicit 0 is preserved. Simulation still uses getEffectiveRiskInputs / lifecycle status for pre vs post selection. */
  const buildUpdatedRisk = useCallback((): Risk | null => {
    if (!currentRisk) return null;
    const prePct = parseNum(preMitigationProbabilityPct);
    const preCostML = parseNum(preMitigationCostML);
    const preTimeML = parseIntNum(preMitigationTimeML);
    const applies = appliesTo;
    const preP =
      prePct != null ? probabilityPctToScale(prePct) : currentRisk.inherentRating.probability;
    const preC = consequenceScaleFromAppliesTo(applies, preCostML ?? 0, preTimeML ?? 0);
    const inherentRating = buildRating(preP, preC);
    const postPct = parseNum(postMitigationProbabilityPct);
    const postCostML = parseNum(postMitigationCostML);
    const postTimeML = parseIntNum(postMitigationTimeML);
    const residualRating =
      postPct != null
        ? buildRating(
            probabilityPctToScale(postPct),
            consequenceScaleFromAppliesTo(applies, postCostML ?? 0, postTimeML ?? 0)
          )
        : currentRisk.residualRating;
    const preCostMin = parseNum(preMitigationCostMin);
    const preCostMax = parseNum(preMitigationCostMax);
    const preTimeMin = parseIntNum(preMitigationTimeMin);
    const preTimeMax = parseIntNum(preMitigationTimeMax);
    const postCostMin = parseNum(postMitigationCostMin);
    const postCostMax = parseNum(postMitigationCostMax);
    const postTimeMin = parseIntNum(postMitigationTimeMin);
    const postTimeMax = parseIntNum(postMitigationTimeMax);
    const catTrim = getResolvedCategoryPickerValue(categorySelect, categoryNewDraft);
    const categoryOut =
      catTrim !== "" ? catTrim : isRiskStatusDraft(status) ? "" : currentRisk.category;
    return {
      ...currentRisk,
      riskNumber: currentRisk.riskNumber,
      title: (title ?? "").trim() || currentRisk.title,
      description: (description ?? "").trim() || undefined,
      category: categoryOut,
      status,
      closureNote: isRiskStatusClosed(status)
        ? closureNote.trim() || currentRisk.closureNote
        : currentRisk.closureNote,
      owner: getResolvedOwnerPickerValue(ownerSelect, ownerNewDraft) || undefined,
      appliesTo: applies,
      preMitigationCostMin: preCostMin,
      preMitigationCostML: preCostML,
      preMitigationCostMax: preCostMax,
      preMitigationTimeMin: preTimeMin,
      preMitigationTimeML: preTimeML,
      preMitigationTimeMax: preTimeMax,
      mitigation: (mitigation ?? "").trim() || undefined,
      mitigationCost: parseNum(mitigationCost),
      postMitigationCostMin: postCostMin,
      postMitigationCostML: postCostML,
      postMitigationCostMax: postCostMax,
      postMitigationTimeMin: postTimeMin,
      postMitigationTimeML: postTimeML,
      postMitigationTimeMax: postTimeMax,
      inherentRating,
      residualRating,
      preMitigationProbabilityPct: prePct,
      postMitigationProbabilityPct: postPct,
      // Modelling mode still drives stored `probability` for dirty parity; simulation uses lifecycle helpers.
      probability:
        mitigationMode !== "none" && postPct != null
          ? postPct / 100
          : prePct != null
            ? prePct / 100
            : undefined,
      mitigationProfile: mergeMitigationProfileForMode(currentRisk, mitigationMode),
      updatedAt: nowIso(),
    };
  }, [
    currentRisk,
    title,
    description,
    categorySelect,
    categoryNewDraft,
    status,
    closureNote,
    ownerSelect,
    ownerNewDraft,
    appliesTo,
    mitigationMode,
    preMitigationProbabilityPct,
    preMitigationCostMin,
    preMitigationCostML,
    preMitigationCostMax,
    preMitigationTimeMin,
    preMitigationTimeML,
    preMitigationTimeMax,
    mitigation,
    mitigationCost,
    postMitigationProbabilityPct,
    postMitigationCostMin,
    postMitigationCostML,
    postMitigationCostMax,
    postMitigationTimeMin,
    postMitigationTimeML,
    postMitigationTimeMax,
  ]);

  const [isDirtyState, setIsDirtyState] = useState(false);
  const isDirtyCancelledRef = useRef(false);
  useEffect(() => {
    isDirtyCancelledRef.current = false;
    const update = () => {
      if (isDirtyCancelledRef.current) return;
      if (!currentRisk || currentIndex === risks.length) {
        setIsDirtyState(false);
        return;
      }
      if (lastSyncedRiskIdRef.current !== currentRisk.id) {
        setIsDirtyState(false);
        return;
      }
      const updated = buildUpdatedRisk();
      if (!updated) {
        setIsDirtyState(false);
        return;
      }
      const currentSnapshot = toComparableSnapshot(updated as Record<string, unknown>);
      const last = lastSavedSnapshotRef.current;

      if (
        last &&
        last.id === currentRisk.id &&
        last.snapshot === currentSnapshot
      ) {
        
        setIsDirtyState(false);
        return;
      }
      const baseline = lastSyncedBaselineRef.current;
      if (baseline == null) {
        setIsDirtyState(false);
        return;
      }
      setIsDirtyState(currentSnapshot !== baseline);
    };
    update();
    return () => {
      isDirtyCancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on currentRisk?.id to avoid re-runs on same-risk reference change; currentRisk read from closure
  }, [currentRisk?.id, currentIndex, risks.length, buildUpdatedRisk]);

  const isDirty = isDirtyState;

  useEffect(() => {
    if (!pendingScrollValidationRef.current || validationErrors.length === 0) return;
    pendingScrollValidationRef.current = false;
    validationBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [validationErrors]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (readOnly) return false;
    if (!currentRisk) return false;
    const enteringClosed =
      isRiskStatusClosed(status) && !isRiskStatusClosed(currentRisk.status);
    if (enteringClosed && !closureNote.trim()) {
      pendingScrollValidationRef.current = true;
      setValidationErrors(["A closure note is required when closing a risk."]);
      return false;
    }
    const categoryResolved = getResolvedCategoryPickerValue(
      categorySelect,
      categoryNewDraft
    );
    const errors = getRiskRegisterSaveValidationErrors({
      status,
      title,
      description,
      category: categoryResolved,
      ownerResolved: getResolvedOwnerPickerValue(ownerSelect, ownerNewDraft) ?? "",
      appliesTo,
      preMitigationProbabilityPct,
      preMitigationCostMin,
      preMitigationCostML,
      preMitigationCostMax,
      preMitigationTimeMin,
      preMitigationTimeML,
      preMitigationTimeMax,
      mitigation,
      mitigationCost,
      postMitigationProbabilityPct,
      postMitigationCostMin,
      postMitigationCostML,
      postMitigationCostMax,
      postMitigationTimeMin,
      postMitigationTimeML,
      postMitigationTimeMax,
    });
    if (errors.length > 0) {
      pendingScrollValidationRef.current = true;
      setValidationErrors(errors);
      return false;
    }
    let categoryCanonical: string | null = null;
    if (shouldPersistNewCategoryOnSubmit(categorySelect) && categoryResolved) {
      try {
        categoryCanonical = await createRiskCategory(categoryResolved);
      } catch (err) {
        setValidationErrors([
          err instanceof Error ? err.message : "Could not save new category. Try again.",
        ]);
        pendingScrollValidationRef.current = true;
        return false;
      }
    }
    const ownerResolved = getResolvedOwnerPickerValue(ownerSelect, ownerNewDraft);
    if (shouldPersistNewOwnerOnSubmit(ownerSelect) && ownerResolved) {
      try {
        await createProjectOwner(ownerResolved);
      } catch (err) {
        setValidationErrors([
          err instanceof Error ? err.message : "Could not save new owner. Try again.",
        ]);
        pendingScrollValidationRef.current = true;
        return false;
      }
    }
    setValidationErrors([]);
    const updated = buildUpdatedRisk();
    if (!updated) return false;
    if (categoryCanonical) {
      updated.category = categoryCanonical;
    }
    dlog("[risk save] detail modal", {
      category: updated.category,
      status: updated.status,
      appliesTo: updated.appliesTo,
      owner: updated.owner,
    });
    const saved = (await onSave(updated)) ?? updated;
    // Mark form as "just saved" so isDirty is false until user edits or switches risk; sync form and update baseline
    if (currentRisk) {
      const snapshot = toComparableSnapshot(saved as Record<string, unknown>);
      lastSavedSnapshotRef.current = { id: currentRisk.id, snapshot };
      lastSyncedBaselineRef.current = snapshot;
      syncFormFromRisk(saved);
    }
    return true;
  }, [
    readOnly,
    buildUpdatedRisk,
    currentRisk,
    onSave,
    syncFormFromRisk,
    status,
    title,
    description,
    categorySelect,
    categoryNewDraft,
    ownerSelect,
    ownerNewDraft,
    appliesTo,
    mitigationMode,
    preMitigationProbabilityPct,
    preMitigationCostMin,
    preMitigationCostML,
    preMitigationCostMax,
    preMitigationTimeMin,
    preMitigationTimeML,
    preMitigationTimeMax,
    mitigation,
    mitigationCost,
    postMitigationProbabilityPct,
    postMitigationCostMin,
    postMitigationCostML,
    postMitigationCostMax,
    postMitigationTimeMin,
    postMitigationTimeML,
    postMitigationTimeMax,
    createProjectOwner,
    createRiskCategory,
    closureNote,
  ]);

  /** Persist pending edits before Prev/Next/Close so navigation does not discard form-only changes. */
  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (readOnly || !currentRisk || currentIndex === risks.length) return true;
    if (lastSyncedBaselineRef.current == null) return true;
    const updated = buildUpdatedRisk();
    if (!updated) return true;
    const snap = toComparableSnapshot(updated as Record<string, unknown>);
    if (snap === lastSyncedBaselineRef.current) return true;
    try {
      return await handleSave();
    } catch (err) {
      console.error("[risk save] detail modal failed", err);
      return false;
    }
  }, [readOnly, currentRisk, currentIndex, risks.length, buildUpdatedRisk, handleSave]);

  const handleRestoreRiskAction = useCallback(() => {
    if (!currentRisk || isAddNewSlot || !isRiskStatusArchived(currentRisk.status)) return;
    void flushPendingSave().then((ok) => {
      if (!ok) return;
      onRestoreRisk?.(currentRisk.id);
      onClose();
    });
  }, [currentRisk, isAddNewSlot, onRestoreRisk, onClose, flushPendingSave]);

  const requestClose = useCallback(() => {
    void flushPendingSave().then((ok) => {
      if (ok) onClose();
    });
  }, [flushPendingSave, onClose]);

  const [explicitSavePending, setExplicitSavePending] = useState(false);
  const handleExplicitSave = useCallback(async () => {
    setExplicitSavePending(true);
    try {
      await handleSave();
    } catch (err) {
      console.error("[risk save] detail modal failed", err);
    } finally {
      setExplicitSavePending(false);
    }
  }, [handleSave]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    void flushPendingSave().then((ok) => {
      if (!ok) return;
      setCurrentIndex((i) => i - 1);
    });
  }, [currentIndex, flushPendingSave]);

  const goNext = useCallback(() => {
    if (currentIndex >= risks.length) return;
    void flushPendingSave().then((ok) => {
      if (!ok) return;
      setCurrentIndex((i) => i + 1);
    });
  }, [currentIndex, risks.length, flushPendingSave]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) requestClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const inputProfile = modellingInputProfileFromMode(mitigationMode);
  const requiredIndicators = getRiskRegisterRequiredIndicators({
    status,
    appliesTo,
    mitigation,
  });
  const showMitigationFields = shouldShowRiskRegisterMitigationFields({
    status,
    mitigationExpanded: inputProfile === "post",
    hasMitigationOrPostData: riskRegisterHasMitigationOrPostData({
      mitigation,
      mitigationCost,
      postMitigationProbabilityPct,
      postMitigationCostMin,
      postMitigationCostML,
      postMitigationCostMax,
      postMitigationTimeMin,
      postMitigationTimeML,
      postMitigationTimeMax,
    }),
  });

  const overlayScrimClass = "ds-modal-backdrop z-[100]";

  const overlay = (
    <div
      className={overlayScrimClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="risk-detail-dialog-title"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-[70vw] max-h-[90vh] min-h-[400px] shrink-0 flex flex-col overflow-hidden outline-none rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 shrink-0 border-b border-[var(--ds-border)] px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isAddNewSlot ? (
              <h2 id="risk-detail-dialog-title" className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
                Add new risk
              </h2>
            ) : isEmpty ? (
              <h2 id="risk-detail-dialog-title" className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
                No risks
              </h2>
            ) : currentRisk ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="w-14 shrink-0 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]"
                  aria-label="Risk ID"
                >
                  {formatRiskRegisterNumberOrId(currentRisk.riskNumber, currentRisk.id)}
                </span>
                <input
                  type="text"
                  value={title}
                  readOnly={readOnly}
                  onChange={(e) => setTitle(e.target.value)}
                  className={
                    "flex-1 min-w-0 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)] bg-transparent " +
                    "border border-transparent rounded-[var(--ds-radius-md)] px-1.5 py-0.5 " +
                    "hover:border-[var(--ds-border)] " +
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
                    "focus-visible:border-[var(--ds-border)]"
                  }
                  aria-label="Risk title"
                  id="risk-detail-dialog-title"
                />
                <RiskStatusSelect
                  id="risk-detail-header-status"
                  value={status}
                  onChange={handleLifecycleStatusChange}
                  disabled={readOnly}
                  className="!h-9 max-w-[13rem] min-w-[8.5rem] shrink-0 py-1 text-[length:var(--ds-text-sm)]"
                  title="Lifecycle status"
                />
                {isRiskStatusArchived(currentRisk.status) && (
                  <Badge status="neutral" variant="subtle" className="shrink-0" aria-label="Archived risk">
                    Archived
                  </Badge>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-2 rounded-[var(--ds-radius-sm)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)] transition-colors shrink-0"
            aria-label="Close"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col">
          {readOnly && (
            <Callout status="info" className="mb-4 shrink-0" role="status">
              <p className="text-[length:var(--ds-text-sm)]">View-only access. Editing is disabled.</p>
            </Callout>
          )}
          {isEmpty || isAddNewSlot ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
              <p className="mb-6">
                {isAddNewSlot ? "Add a new risk to the register." : "There are no risks to review."}
              </p>
              {!readOnly && (onAddNewWithFile != null || onAddNewWithAI != null) ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  {onAddNewWithFile && (
                    <Button type="button" variant="primary" size="md" onClick={onAddNewWithFile}>
                      Create Risk with AI File Uploader
                    </Button>
                  )}
                  {onAddNewWithAI && (
                    <Button type="button" variant="primary" size="md" onClick={onAddNewWithAI}>
                      Create Risk with AI
                    </Button>
                  )}
                </div>
              ) : !readOnly && onAddNew ? (
                <Button type="button" variant="primary" size="md" onClick={onAddNew}>
                  {isAddNewSlot ? "Add new risk" : "Create new risk"}
                </Button>
              ) : null}
            </div>
          ) : (
            currentRisk && (
              <div className={`space-y-6 ${readOnly ? "pointer-events-none select-text" : ""}`}>
                {(() => {
                  const runnableErrors = getRiskValidationErrors(currentRisk);
                  return runnableErrors.length > 0 ? (
                    <Callout status="warning" role="status">
                      <p className="font-medium mb-1 text-[length:var(--ds-text-sm)]">Fix these to run simulation:</p>
                      <ul className="list-disc list-inside text-[length:var(--ds-text-sm)] space-y-0.5">{runnableErrors.map((e) => <li key={e}>{e}</li>)}</ul>
                    </Callout>
                  ) : null;
                })()}
                {validationErrors.length > 0 && (
                  <div ref={validationBlockRef}>
                    <Callout status="danger" role="alert">
                      <p className="font-medium mb-1 text-[length:var(--ds-text-sm)]">Complete all required fields before saving (non-draft risks):</p>
                      <ul className="list-disc list-inside text-[length:var(--ds-text-sm)] space-y-0.5">{validationErrors.map((e) => <li key={e}>{e}</li>)}</ul>
                    </Callout>
                  </div>
                )}
                {/* Risk details + Pre-Mitigation — single risk detail card */}
                <Card className="ds-risk-detail-section-card">
                  <CardHeader className="ds-risk-detail-card-header">
                    <h2 className="ds-risk-detail-card-title">Risk Details</h2>
                  </CardHeader>
                  <CardBody className="ds-risk-detail-card-body">
                    <div className="space-y-3">
                      {isRiskStatusDraft(status) && (
                        <Callout status="warning">
                          <p className="text-[length:var(--ds-text-sm)]">
                            This risk is in draft. Change status to Open and save to include it in simulation.
                          </p>
                        </Callout>
                      )}
                      {isRiskStatusClosed(status) && (
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="detail-closure-note" className="block">
                            Closure note
                            {currentRisk && !isRiskStatusClosed(currentRisk.status) ? (
                              <span className="text-[var(--ds-status-danger-fg)]" aria-label="required">
                                {" "}
                                *
                              </span>
                            ) : null}
                          </Label>
                          <Textarea
                            id="detail-closure-note"
                            value={closureNote}
                            onChange={(e) => setClosureNote(e.target.value)}
                            readOnly={readOnly}
                            rows={3}
                            placeholder="Why this risk is being closed"
                            aria-required={
                              currentRisk != null && !isRiskStatusClosed(currentRisk.status)
                            }
                          />
                          {currentRisk?.closedAt ? (
                            <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                              Closed {new Date(currentRisk.closedAt).toLocaleString()}
                              {currentRisk.closedBy ? ` · by user ${currentRisk.closedBy.slice(0, 8)}…` : ""}
                            </p>
                          ) : currentRisk && isRiskStatusClosed(currentRisk.status) ? (
                            <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                              Legacy closed risk — closure date/user were not recorded.
                            </p>
                          ) : null}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <Label className="block mb-2">
                          Applies To
                        </Label>
                        <div
                          className="ds-segmented-control"
                          role="group"
                          aria-label="Applies to"
                        >
                          <Button
                            type="button"
                            variant={normalizeAppliesToKey(appliesTo) !== "cost" && normalizeAppliesToKey(appliesTo) !== "time" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => setAppliesTo("both")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={normalizeAppliesToKey(appliesTo) !== "cost" && normalizeAppliesToKey(appliesTo) !== "time"}
                          >
                            Cost &amp; Time
                          </Button>
                          <Button
                            type="button"
                            variant={normalizeAppliesToKey(appliesTo) === "cost" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => setAppliesTo("cost")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={normalizeAppliesToKey(appliesTo) === "cost"}
                          >
                            Cost
                          </Button>
                          <Button
                            type="button"
                            variant={normalizeAppliesToKey(appliesTo) === "time" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => setAppliesTo("time")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={normalizeAppliesToKey(appliesTo) === "time"}
                          >
                            Time
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="detail-description" className="block">
                          Risk Description {requiredIndicators.assessmentBasics && <RequiredStar />}
                        </Label>
                        <Textarea
                          id="detail-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-h-[80px]"
                          placeholder="Include a detailed description of the risk."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="detail-category" className="block">
                            Category {requiredIndicators.assessmentBasics && <RequiredStar />}
                          </Label>
                          <RiskCategoryPicker
                            id="detail-category"
                            selectValue={categorySelect}
                            newNameDraft={categoryNewDraft}
                            onSelectChange={setCategorySelect}
                            onNewNameDraftChange={setCategoryNewDraft}
                            allowEmptyPlaceholder
                          />
                        </div>
                        <div>
                          <Label htmlFor="detail-owner" className="block">
                            Risk Manager {requiredIndicators.assessmentBasics && <RequiredStar />}
                          </Label>
                          <RiskOwnerPicker
                            id="detail-owner"
                            selectValue={ownerSelect}
                            newNameDraft={ownerNewDraft}
                            onSelectChange={setOwnerSelect}
                            onNewNameDraftChange={setOwnerNewDraft}
                            allowEmptyPlaceholder
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 border-t border-[var(--ds-border-subtle)] pt-6">
                      <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">
                        Pre-Mitigation
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="detail-pre-prob" className="block">
                            Probability % {requiredIndicators.preProbability && <RequiredStar />}
                          </Label>
                          <div className="grid grid-cols-3 gap-2 items-center">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={Math.min(100, Math.max(0, parseFloat(preMitigationProbabilityPct) || 0))}
                              onChange={(e) => setPreMitigationProbabilityPct(e.target.value)}
                              className={rangeTrackClass}
                              aria-label="Pre-Mitigation Probability %"
                            />
                            <Input
                              id="detail-pre-prob"
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={preMitigationProbabilityPct}
                              onChange={(e) => setPreMitigationProbabilityPct(e.target.value)}
                              placeholder="0–100"
                            />
                          </div>
                        </div>
                        {appliesToAffectsCost(appliesTo) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="detail-pre-cost-min" className="block">Cost Min ($) {requiredIndicators.preCost && <RequiredStar />}</Label>
                            <Input id="detail-pre-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMin)} onChange={(e) => setPreMitigationCostMin(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-cost-ml" className="block">Cost Most Likely ($) {requiredIndicators.preCost && <RequiredStar />}</Label>
                            <Input id="detail-pre-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostML)} onChange={(e) => setPreMitigationCostML(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-cost-max" className="block">Cost Max ($) {requiredIndicators.preCost && <RequiredStar />}</Label>
                            <Input id="detail-pre-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMax)} onChange={(e) => setPreMitigationCostMax(parseCostInput(e.target.value))} />
                          </div>
                        </div>
                        )}
                        {appliesToAffectsTime(appliesTo) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="detail-pre-time-min" className="block">Time Min (working days) {requiredIndicators.preTime && <RequiredStar />}</Label>
                            <Input id="detail-pre-time-min" type="number" min={0} step={1} value={preMitigationTimeMin} onChange={(e) => setPreMitigationTimeMin(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-time-ml" className="block">Time ML (working days) {requiredIndicators.preTime && <RequiredStar />}</Label>
                            <Input id="detail-pre-time-ml" type="number" min={0} step={1} value={preMitigationTimeML} onChange={(e) => setPreMitigationTimeML(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-time-max" className="block">Time Max (working days) {requiredIndicators.preTime && <RequiredStar />}</Label>
                            <Input id="detail-pre-time-max" type="number" min={0} step={1} value={preMitigationTimeMax} onChange={(e) => setPreMitigationTimeMax(e.target.value)} />
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Mitigation + Post-Mitigation — risk detail card */}
                <Card className="ds-risk-detail-section-card">
                  <CardHeader className="ds-risk-detail-card-header">
                    <h2 className="ds-risk-detail-card-title">Mitigation</h2>
                  </CardHeader>
                  <CardBody className="ds-risk-detail-card-body">
                    <div className="space-y-3">
                      <div className="flex flex-col">
                        <Label className="block mb-2">Input profile</Label>
                        <div
                          className="ds-segmented-control"
                          role="group"
                          aria-label="Input profile"
                        >
                          <Button
                            type="button"
                            variant={inputProfile === "pre" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleInputProfileChange("pre")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={inputProfile === "pre"}
                          >
                            Pre-mitigation
                          </Button>
                          <Button
                            type="button"
                            variant={inputProfile === "post" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleInputProfileChange("post")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={inputProfile === "post"}
                          >
                            Post-mitigation
                          </Button>
                        </div>
                      </div>
                    </div>

                    {showMitigationFields && (
                      <>
                        <div className="mt-6 border-t border-[var(--ds-border-subtle)] pt-6">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="detail-mitigation" className="block">
                                Description {requiredIndicators.mitigationDescription && <RequiredStar />}
                              </Label>
                              <Textarea
                                id="detail-mitigation"
                                value={mitigation}
                                onChange={(e) => setMitigation(e.target.value)}
                                className="min-h-[60px]"
                                placeholder="Mitigation strategy"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label htmlFor="detail-mitigation-cost" className="block">
                                Mitigation Cost ($) {requiredIndicators.mitigationCost && <RequiredStar />}
                              </Label>
                              <Input
                                id="detail-mitigation-cost"
                                type="text"
                                inputMode="numeric"
                                value={formatCostDisplay(mitigationCost)}
                                onChange={(e) => setMitigationCost(parseCostInput(e.target.value))}
                                placeholder="—"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-[var(--ds-border-subtle)] pt-6">
                          <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">Post-Mitigation</h3>
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="detail-post-prob" className="block">
                                Post-Mitigation Probability {requiredIndicators.postProbability && <RequiredStar />}
                              </Label>
                              <div className="grid grid-cols-3 gap-2 items-center">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={Math.min(100, Math.max(0, parseFloat(postMitigationProbabilityPct) || 0))}
                                  onChange={(e) => setPostMitigationProbabilityPct(e.target.value)}
                                  className={rangeTrackClass}
                                  aria-label="Post-Mitigation Probability (percent)"
                                />
                                <Input
                                  id="detail-post-prob"
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={postMitigationProbabilityPct}
                                  onChange={(e) => setPostMitigationProbabilityPct(e.target.value)}
                                  placeholder="0–100"
                                />
                              </div>
                            </div>
                            {appliesToAffectsCost(appliesTo) && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label htmlFor="detail-post-cost-min" className="block">Cost Min ($) {requiredIndicators.postCost && <RequiredStar />}</Label>
                                <Input id="detail-post-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMin)} onChange={(e) => setPostMitigationCostMin(parseCostInput(e.target.value))} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-cost-ml" className="block">Cost Most Likely ($) {requiredIndicators.postCost && <RequiredStar />}</Label>
                                <Input id="detail-post-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostML)} onChange={(e) => setPostMitigationCostML(parseCostInput(e.target.value))} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-cost-max" className="block">Cost Max ($) {requiredIndicators.postCost && <RequiredStar />}</Label>
                                <Input id="detail-post-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMax)} onChange={(e) => setPostMitigationCostMax(parseCostInput(e.target.value))} />
                              </div>
                            </div>
                            )}
                            {appliesToAffectsTime(appliesTo) && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label htmlFor="detail-post-time-min" className="block">Time Min (working days) {requiredIndicators.postTime && <RequiredStar />}</Label>
                                <Input id="detail-post-time-min" type="number" min={0} step={1} value={postMitigationTimeMin} onChange={(e) => setPostMitigationTimeMin(e.target.value)} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-time-ml" className="block">Time ML (working days) {requiredIndicators.postTime && <RequiredStar />}</Label>
                                <Input id="detail-post-time-ml" type="number" min={0} step={1} value={postMitigationTimeML} onChange={(e) => setPostMitigationTimeML(e.target.value)} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-time-max" className="block">Time Max (working days) {requiredIndicators.postTime && <RequiredStar />}</Label>
                                <Input id="detail-post-time-max" type="number" min={0} step={1} value={postMitigationTimeMax} onChange={(e) => setPostMitigationTimeMax(e.target.value)} />
                              </div>
                            </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </div>
            )
          )}
        </div>

        {(!isEmpty || isAddNewSlot) && (!readOnly || (hasMultipleOrAddNew && !isAddNewSlot)) && (
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] w-full">
            {!readOnly && currentRisk && !isAddNewSlot && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void handleExplicitSave()}
                disabled={explicitSavePending || !isDirty}
                aria-busy={explicitSavePending}
                title={!isDirty && !explicitSavePending ? "No changes to save" : undefined}
              >
                {explicitSavePending ? "Saving…" : "Save"}
              </Button>
            )}
            {!readOnly &&
              isAddNewSlot &&
              onAddNew &&
              onAddNewWithFile == null &&
              onAddNewWithAI == null && (
                <Button type="button" variant="primary" size="md" onClick={onAddNew}>
                  Add new risk
                </Button>
              )}
            {!readOnly && !isAddNewSlot && currentRisk && onRestoreRisk && isRiskStatusArchived(currentRisk.status) && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleRestoreRiskAction}
                aria-label="Restore risk to Draft status"
              >
                Restore to Draft
              </Button>
            )}
            {hasMultipleOrAddNew && !isAddNewSlot && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  aria-label="Previous risk"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={goNext}
                  disabled={currentIndex === risks.length || (isLast && !hasAddNewSlot)}
                  aria-label="Next risk"
                >
                  Next
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
