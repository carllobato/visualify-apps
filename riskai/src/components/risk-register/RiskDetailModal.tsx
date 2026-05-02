"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Risk, RiskStatus, AppliesTo, MitigationMode } from "@/domain/risk/risk.schema";
import { formatRiskRegisterNumberOrId } from "@/domain/risk/riskRegisterDisplay";
import { mergeMitigationProfileForMode, mitigationModeFromRisk } from "@/domain/risk/mitigationMode";
import {
  buildRating,
  probabilityPctToScale,
  probabilityScaleToDisplayPct,
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
  normalizeRiskStatusKey,
  statusAutoFromMitigationMode,
} from "@/domain/risk/riskFieldSemantics";
import { dlog } from "@/lib/debug";
import { getRiskValidationErrors } from "@/domain/risk/runnable-risk.validator";
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
import { RiskCategorySelect } from "./RiskCategorySelect";
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

/** For non-draft risks, all key cells are required. When mitigationMode is none, mitigation/post fields are not required. */
function validateNonDraftRisk(form: {
  status: RiskStatus;
  mitigationMode: MitigationMode;
  title: string;
  description: string;
  ownerSelect: string;
  ownerNewDraft: string;
  appliesTo: AppliesTo;
  preMitigationProbabilityPct: string;
  preMitigationCostMin: string;
  preMitigationCostML: string;
  preMitigationCostMax: string;
  preMitigationTimeMin: string;
  preMitigationTimeML: string;
  preMitigationTimeMax: string;
  category: string;
  mitigation: string;
  postMitigationProbabilityPct: string;
  postMitigationCostMin: string;
  postMitigationCostML: string;
  postMitigationCostMax: string;
  postMitigationTimeMin: string;
  postMitigationTimeML: string;
  postMitigationTimeMax: string;
}): string[] {
  const errors: string[] = [];
  if (!form.status.trim()) errors.push("Status");
  if (!form.appliesTo.trim()) errors.push("Applies to");
  if (isRiskStatusDraft(form.status)) return errors;
  if (!form.title.trim()) errors.push("Title");
  if (!form.description.trim()) errors.push("Risk Description");
  if (!form.category.trim()) errors.push("Category");
  const ownerResolved = getResolvedOwnerPickerValue(form.ownerSelect, form.ownerNewDraft);
  if (!ownerResolved) errors.push("Risk Manager");
  const prePct = parseFloat(form.preMitigationProbabilityPct);
  if (!Number.isFinite(prePct) || prePct < 0 || prePct > 100) errors.push("Pre-Mitigation Probability %");
  if (appliesToAffectsCost(form.appliesTo)) {
    const preCostMin = parseFloat(form.preMitigationCostMin);
    if (form.preMitigationCostMin.trim() === "" || !Number.isFinite(preCostMin) || preCostMin < 0) errors.push("Pre-Mitigation Cost Min");
    const v = parseFloat(form.preMitigationCostML);
    if (!Number.isFinite(v) || v < 0) errors.push("Pre-Mitigation Cost Most Likely");
    const preCostMax = parseFloat(form.preMitigationCostMax);
    if (form.preMitigationCostMax.trim() === "" || !Number.isFinite(preCostMax) || preCostMax < 0) errors.push("Pre-Mitigation Cost Max");
  }
  if (appliesToAffectsTime(form.appliesTo)) {
    const preTimeMin = parseInt(form.preMitigationTimeMin, 10);
    if (form.preMitigationTimeMin.trim() === "" || !Number.isFinite(preTimeMin) || preTimeMin < 0) errors.push("Pre-Mitigation Time Min (working days)");
    const v = parseInt(form.preMitigationTimeML, 10);
    if (!Number.isFinite(v) || v < 0) errors.push("Pre-Mitigation Time ML (working days)");
    const preTimeMax = parseInt(form.preMitigationTimeMax, 10);
    if (form.preMitigationTimeMax.trim() === "" || !Number.isFinite(preTimeMax) || preTimeMax < 0) errors.push("Pre-Mitigation Time Max (working days)");
  }
  if (form.mitigationMode !== "none") {
    const postPctRaw = form.postMitigationProbabilityPct.trim();
    if (postPctRaw !== "") {
      const postPct = parseFloat(postPctRaw);
      if (!Number.isFinite(postPct) || postPct < 0 || postPct > 100) errors.push("Post-Mitigation Probability");
    }
    if (appliesToAffectsCost(form.appliesTo)) {
      if (form.postMitigationCostMin.trim() !== "") {
        const postCostMin = parseFloat(form.postMitigationCostMin);
        if (!Number.isFinite(postCostMin) || postCostMin < 0) errors.push("Post-Mitigation Cost Min");
      }
      if (form.postMitigationCostML.trim() !== "") {
        const v = parseFloat(form.postMitigationCostML);
        if (!Number.isFinite(v) || v < 0) errors.push("Post-Mitigation Cost Most Likely");
      }
      if (form.postMitigationCostMax.trim() !== "") {
        const postCostMax = parseFloat(form.postMitigationCostMax);
        if (!Number.isFinite(postCostMax) || postCostMax < 0) errors.push("Post-Mitigation Cost Max");
      }
    }
    if (appliesToAffectsTime(form.appliesTo)) {
      if (form.postMitigationTimeMin.trim() !== "") {
        const postTimeMin = parseInt(form.postMitigationTimeMin, 10);
        if (!Number.isFinite(postTimeMin) || postTimeMin < 0) errors.push("Post-Mitigation Time Min (working days)");
      }
      if (form.postMitigationTimeML.trim() !== "") {
        const v = parseInt(form.postMitigationTimeML, 10);
        if (!Number.isFinite(v) || v < 0) errors.push("Post-Mitigation Time ML (working days)");
      }
      if (form.postMitigationTimeMax.trim() !== "") {
        const postTimeMax = parseInt(form.postMitigationTimeMax, 10);
        if (!Number.isFinite(postTimeMax) || postTimeMax < 0) errors.push("Post-Mitigation Time Max (working days)");
      }
    }
  }
  return errors;
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
  onReviewOpen,
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
  /** Restore archived risk to Open. */
  onRestoreRisk?: (riskId: string) => void;
  /** Mark the visible existing risk as reviewed for freshness tracking. */
  onReviewOpen?: (riskId: string) => void | Promise<void>;
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
  const [category, setCategory] = useState("");
  const { createProjectOwner } = useRiskProjectOwners();
  const [ownerSelect, setOwnerSelect] = useState("");
  const [ownerNewDraft, setOwnerNewDraft] = useState("");
  const [status, setStatus] = useState<RiskStatus>("open");
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
  const reviewedRiskIdsThisOpenRef = useRef<Set<string>>(new Set());

  const currentRisk = risks[currentIndex] ?? null;
  const currentRiskId = currentRisk?.id;
  const isAddNewSlot = currentIndex === risks.length;
  const hasMultipleOrAddNew = risks.length >= 1 || isAddNewSlot;
  const hasAddNewSlot = !!(onAddNew ?? onAddNewWithFile ?? onAddNewWithAI);
  const isLast = risks.length > 0 && currentIndex === risks.length - 1;
  const isEmpty = risks.length === 0;

  const syncFormFromRisk = useCallback((risk: Risk) => {
    setTitle(risk.title);
    setDescription(risk.description ?? "");
    setCategory(risk.category);
    setStatus(risk.status);
    const rawOwner = risk.owner ?? "";
    const ownerVal = rawOwner === "Unassigned" ? "" : rawOwner.trim();
    setOwnerSelect(ownerVal);
    setOwnerNewDraft("");
    setAppliesTo(risk.appliesTo ?? "both");
    const mode = mitigationModeFromRisk(risk);
    setMitigationMode(mode);
    const hasMitigation = mode !== "none";
    setMitigation(risk.mitigation ?? "");
    setMitigationCost(risk.mitigationCost?.toString() ?? "");
    const prePct = risk.preMitigationProbabilityPct ?? probabilityScaleToDisplayPct(risk.inherentRating.probability);
    const preCostML = risk.preMitigationCostML ?? 0;
    const preTimeML = risk.preMitigationTimeML ?? 0;
    setPreMitigationProbabilityPct(String(prePct));
    setPreMitigationCostMin(
      risk.preMitigationCostMin?.toString() ?? (preCostML != null ? "0" : "")
    );
    setPreMitigationCostML(String(preCostML));
    setPreMitigationCostMax(
      risk.preMitigationCostMax?.toString() ?? (preCostML != null ? String(preCostML) : "")
    );
    setPreMitigationTimeMin(
      risk.preMitigationTimeMin?.toString() ?? (preTimeML != null ? "0" : "")
    );
    setPreMitigationTimeML(String(preTimeML));
    setPreMitigationTimeMax(
      risk.preMitigationTimeMax?.toString() ?? (preTimeML != null ? String(preTimeML) : "")
    );
    // Post-Mitigation: only set form state when mitigation mode is not none, so dirty check (buildUpdatedRisk) matches. When none, leave post fields empty so we don't get false positives.
    if (hasMitigation) {
      const postPct = risk.postMitigationProbabilityPct ?? probabilityScaleToDisplayPct(risk.residualRating.probability);
      const postCostML = risk.postMitigationCostML ?? preCostML;
      const postTimeML = risk.postMitigationTimeML ?? preTimeML;
      setPostMitigationProbabilityPct(String(postPct));
      setPostMitigationCostMin(
        risk.postMitigationCostMin?.toString() ?? (postCostML != null ? "0" : "")
      );
      setPostMitigationCostML(postCostML != null ? String(postCostML) : "");
      setPostMitigationCostMax(
        risk.postMitigationCostMax?.toString() ?? (postCostML != null ? String(postCostML) : "")
      );
      setPostMitigationTimeMin(
        risk.postMitigationTimeMin?.toString() ?? (postTimeML != null ? "0" : "")
      );
      setPostMitigationTimeML(postTimeML != null ? String(postTimeML) : "");
      setPostMitigationTimeMax(
        risk.postMitigationTimeMax?.toString() ?? (postTimeML != null ? String(postTimeML) : "")
      );
    } else {
      setPostMitigationProbabilityPct("");
      setPostMitigationCostMin("");
      setPostMitigationCostML("");
      setPostMitigationCostMax("");
      setPostMitigationTimeMin("");
      setPostMitigationTimeML("");
      setPostMitigationTimeMax("");
    }
  }, []);

  /** Normalize a risk the same way buildUpdatedRisk normalizes form output, so we can compare without false positives (e.g. "" vs undefined). When mitigation mode is none, post-mitigation fields are undefined to match buildUpdatedRisk. When mitigation exists but post min/max are missing (e.g. old DB), derive same defaults as buildUpdatedRisk (0 for min, ML for max) so dirty check does not false-positive. Pre-mitigation min/max use same defaults as buildUpdatedRisk (0 for min, Math.max(ML, min) for max) so undefined does not trigger a false dirty. */
  const normalizeRiskForComparison = useCallback((risk: Risk): Risk => {
    const toNum = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" ? (Number.isFinite(Number(v)) ? Number(v) : undefined) : undefined;
    const toInt = (v: unknown): number | undefined => {
      const n = toNum(v);
      return n != null ? Math.floor(n) : undefined;
    };
    const mode = mitigationModeFromRisk(risk);
    const hasMitigation = mode !== "none";
    const prePct = risk.preMitigationProbabilityPct ?? probabilityScaleToDisplayPct(risk.inherentRating.probability);
    const preCostML = risk.preMitigationCostML ?? 0;
    const preTimeML = risk.preMitigationTimeML ?? 0;
    const postPct = hasMitigation
      ? (risk.postMitigationProbabilityPct ?? probabilityScaleToDisplayPct(risk.residualRating.probability))
      : undefined;
    const postCostML = hasMitigation ? (risk.postMitigationCostML ?? preCostML) : undefined;
    const postTimeML = hasMitigation ? (risk.postMitigationTimeML ?? preTimeML) : undefined;
    const applies = risk.appliesTo ?? "both";
    const preP = probabilityPctToScale(prePct);
    const preC = consequenceScaleFromAppliesTo(applies, preCostML, preTimeML);
    const inherentRating = buildRating(preP, preC);
    const residualRating =
      hasMitigation && postPct != null && postCostML != null && postTimeML != null
        ? buildRating(
            probabilityPctToScale(postPct),
            consequenceScaleFromAppliesTo(applies, postCostML, postTimeML)
          )
        : inherentRating;
    // When mitigation exists and we have post ML values, default missing post min/max to same as buildUpdatedRisk (0 for min, Math.max(ML, min) for max) so dirty check matches even when min > ML (partial data).
    const postCostMin =
      hasMitigation ? (risk.postMitigationCostMin ?? (postCostML != null ? 0 : undefined)) : undefined;
    const postCostMax =
      hasMitigation
        ? (risk.postMitigationCostMax ?? (postCostML != null ? Math.max(postCostML, postCostMin ?? 0) : undefined))
        : undefined;
    const postTimeMin =
      hasMitigation ? (risk.postMitigationTimeMin ?? (postTimeML != null ? 0 : undefined)) : undefined;
    const postTimeMax =
      hasMitigation
        ? (risk.postMitigationTimeMax ?? (postTimeML != null ? Math.max(postTimeML, postTimeMin ?? 0) : undefined))
        : undefined;
    // Apply same defaults as buildUpdatedRisk for pre-mitigation min/max (0 for min, Math.max(ML, min) for max) so dirty check does not false-positive when fields are undefined.
    const preCostMin = toNum(risk.preMitigationCostMin) ?? 0;
    const preCostMax = toNum(risk.preMitigationCostMax) ?? Math.max(preCostML, preCostMin);
    const preTimeMin = toInt(risk.preMitigationTimeMin) ?? 0;
    const preTimeMax = toInt(risk.preMitigationTimeMax) ?? Math.max(preTimeML, preTimeMin);
    return {
      ...risk,
      title: (risk.title ?? "").trim() || risk.title,
      description: risk.description?.trim() || undefined,
      category: risk.category,
      status: risk.status,
      owner: risk.owner?.trim() || undefined,
      appliesTo: applies,
      preMitigationCostMin: preCostMin,
      preMitigationCostML: preCostML ?? undefined,
      preMitigationCostMax: preCostMax,
      preMitigationTimeMin: preTimeMin,
      preMitigationTimeML: preTimeML ?? undefined,
      preMitigationTimeMax: preTimeMax,
      mitigation: hasMitigation ? (risk.mitigation?.trim() || undefined) : undefined,
      mitigationCost: hasMitigation ? (risk.mitigationCost ?? undefined) : undefined,
      postMitigationCostMin: postCostMin,
      postMitigationCostML: postCostML ?? undefined,
      postMitigationCostMax: postCostMax,
      postMitigationTimeMin: postTimeMin,
      postMitigationTimeML: postTimeML ?? undefined,
      postMitigationTimeMax: postTimeMax,
      inherentRating,
      residualRating,
      probability: (hasMitigation && postPct != null ? postPct : prePct) / 100,
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

  useEffect(() => {
    if (!open) {
      reviewedRiskIdsThisOpenRef.current.clear();
      return;
    }
    if (!currentRiskId || isAddNewSlot || !onReviewOpen) return;
    if (reviewedRiskIdsThisOpenRef.current.has(currentRiskId)) return;
    reviewedRiskIdsThisOpenRef.current.add(currentRiskId);
    void onReviewOpen(currentRiskId);
  }, [open, currentRiskId, isAddNewSlot, onReviewOpen]);

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

  const handleMitigationModeChange = useCallback(
    (next: MitigationMode) => {
      setMitigationMode(next);
      if (isRiskStatusClosed(status) || isRiskStatusArchived(status)) return;
      if (next === "none") {
        if (isRiskStatusDraft(status)) return;
        const openName = findRiskStatusNameByKeys(riskStatusOptions, ["open"]);
        if (openName) setStatus(openName);
        return;
      }
      const auto = statusAutoFromMitigationMode(next, riskStatusOptions);
      if (auto) setStatus(auto);
    },
    [status, riskStatusOptions]
  );

  /** Header status dropdown: keep modelling mitigation mode aligned with lifecycle (same mapping as mitigationModeFromRisk). */
  const handleLifecycleStatusChange = useCallback((next: string) => {
    setStatus(next as RiskStatus);
    if (isRiskStatusClosed(next) || isRiskStatusArchived(next)) return;
    const k = normalizeRiskStatusKey(next);
    if (k === "monitoring") {
      setMitigationMode("forecast");
      return;
    }
    if (k === "mitigating" || k === "mitigated") {
      setMitigationMode("active");
      return;
    }
    if (k === "open") {
      setMitigationMode("none");
    }
  }, []);

  const parseNum = (s: string): number | undefined => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : undefined;
  };
  const parseIntNum = (s: string): number | undefined => {
    const v = parseInt(s, 10);
    return Number.isFinite(v) ? v : undefined;
  };

  /** Build the risk as it would be saved from current form state (for dirty check and save). When mitigationMode is none, residual = inherent and no mitigation fields. Forecast vs active both persist post fields for now; simulation still uses existing getEffectiveRiskInputs rules until that layer reads `mitigationProfile.status`. */
  const buildUpdatedRisk = useCallback((): Risk | null => {
    if (!currentRisk) return null;
    const prePct = parseNum(preMitigationProbabilityPct) ?? 50;
    const preCostML = parseNum(preMitigationCostML) ?? 0;
    const preTimeML = parseIntNum(preMitigationTimeML) ?? 0;
    const applies = appliesTo;
    const preP = probabilityPctToScale(prePct);
    const preC = consequenceScaleFromAppliesTo(applies, preCostML, preTimeML);
    const inherentRating = buildRating(preP, preC);
    const persistMitigationFields = mitigationMode !== "none";
    const postPct = persistMitigationFields ? (parseNum(postMitigationProbabilityPct) ?? 50) : prePct;
    const postCostML = persistMitigationFields ? (parseNum(postMitigationCostML) ?? preCostML) : preCostML;
    const postTimeML = persistMitigationFields ? (parseIntNum(postMitigationTimeML) ?? preTimeML) : preTimeML;
    const postP = probabilityPctToScale(postPct);
    const postC = consequenceScaleFromAppliesTo(applies, postCostML, postTimeML);
    const residualRating = buildRating(postP, postC);
    const preCostMin = parseNum(preMitigationCostMin) ?? 0;
    const preCostMax = parseNum(preMitigationCostMax) ?? Math.max(preCostML, preCostMin);
    const preTimeMin = parseIntNum(preMitigationTimeMin) ?? 0;
    const preTimeMax = parseIntNum(preMitigationTimeMax) ?? Math.max(preTimeML, preTimeMin);
    const postCostMin = persistMitigationFields ? (parseNum(postMitigationCostMin) ?? 0) : undefined;
    const postCostMax = persistMitigationFields
      ? (parseNum(postMitigationCostMax) ?? Math.max(postCostML, postCostMin ?? 0))
      : undefined;
    const postTimeMin = persistMitigationFields ? (parseIntNum(postMitigationTimeMin) ?? 0) : undefined;
    const postTimeMax = persistMitigationFields
      ? (parseIntNum(postMitigationTimeMax) ?? Math.max(postTimeML, postTimeMin ?? 0))
      : undefined;
    const catTrim = (category ?? "").trim();
    const categoryOut =
      catTrim !== "" ? catTrim : isRiskStatusDraft(status) ? "" : currentRisk.category;
    return {
      ...currentRisk,
      riskNumber: currentRisk.riskNumber,
      title: (title ?? "").trim() || currentRisk.title,
      description: (description ?? "").trim() || undefined,
      category: categoryOut,
      status,
      owner: getResolvedOwnerPickerValue(ownerSelect, ownerNewDraft) || undefined,
      appliesTo: applies,
      preMitigationCostMin: preCostMin,
      preMitigationCostML: preCostML ?? undefined,
      preMitigationCostMax: preCostMax,
      preMitigationTimeMin: preTimeMin,
      preMitigationTimeML: preTimeML ?? undefined,
      preMitigationTimeMax: preTimeMax,
      mitigation: persistMitigationFields ? ((mitigation ?? "").trim() || undefined) : undefined,
      mitigationCost: persistMitigationFields ? (parseNum(mitigationCost) ?? undefined) : undefined,
      postMitigationCostMin: postCostMin,
      postMitigationCostML: persistMitigationFields ? (postCostML ?? undefined) : undefined,
      postMitigationCostMax: postCostMax,
      postMitigationTimeMin: postTimeMin,
      postMitigationTimeML: persistMitigationFields ? (postTimeML ?? undefined) : undefined,
      postMitigationTimeMax: postTimeMax,
      inherentRating,
      residualRating,
      preMitigationProbabilityPct: prePct,
      postMitigationProbabilityPct: persistMitigationFields ? postPct : undefined,
      probability: (persistMitigationFields ? postPct : prePct) / 100,
      mitigationProfile: mergeMitigationProfileForMode(currentRisk, mitigationMode),
      updatedAt: nowIso(),
    };
  }, [
    currentRisk,
    title,
    description,
    category,
    status,
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
    const updated = buildUpdatedRisk();
    if (!updated) return false;
    const errors = validateNonDraftRisk({
      status,
      mitigationMode,
      title,
      description,
      category,
      ownerSelect,
      ownerNewDraft,
      appliesTo,
      preMitigationProbabilityPct,
      preMitigationCostMin,
      preMitigationCostML,
      preMitigationCostMax,
      preMitigationTimeMin,
      preMitigationTimeML,
      preMitigationTimeMax,
      mitigation,
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
    category,
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
    postMitigationProbabilityPct,
    postMitigationCostMin,
    postMitigationCostML,
    postMitigationCostMax,
    postMitigationTimeMin,
    postMitigationTimeML,
    postMitigationTimeMax,
    createProjectOwner,
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
                          Risk Description {!isRiskStatusDraft(status) && <RequiredStar />}
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
                            Category {!isRiskStatusDraft(status) && <RequiredStar />}
                          </Label>
                          <RiskCategorySelect
                            id="detail-category"
                            value={category}
                            onChange={setCategory}
                            allowEmptyPlaceholder
                          />
                        </div>
                        <div>
                          <Label htmlFor="detail-owner" className="block">
                            Risk Manager {!isRiskStatusDraft(status) && <RequiredStar />}
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
                            Probability % {!isRiskStatusDraft(status) && <RequiredStar />}
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
                            <Label htmlFor="detail-pre-cost-min" className="block">Cost Min ($) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                            <Input id="detail-pre-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMin)} onChange={(e) => setPreMitigationCostMin(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-cost-ml" className="block">Cost Most Likely ($) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                            <Input id="detail-pre-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostML)} onChange={(e) => setPreMitigationCostML(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-cost-max" className="block">Cost Max ($) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                            <Input id="detail-pre-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMax)} onChange={(e) => setPreMitigationCostMax(parseCostInput(e.target.value))} />
                          </div>
                        </div>
                        )}
                        {appliesToAffectsTime(appliesTo) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="detail-pre-time-min" className="block">Time Min (working days) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                            <Input id="detail-pre-time-min" type="number" min={0} step={1} value={preMitigationTimeMin} onChange={(e) => setPreMitigationTimeMin(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-time-ml" className="block">Time ML (working days) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                            <Input id="detail-pre-time-ml" type="number" min={0} step={1} value={preMitigationTimeML} onChange={(e) => setPreMitigationTimeML(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="detail-pre-time-max" className="block">Time Max (working days) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
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
                        <Label className="block mb-2">Mitigation Status</Label>
                        <div
                          className="ds-segmented-control"
                          role="group"
                          aria-label="Mitigation status"
                        >
                          <Button
                            type="button"
                            variant={mitigationMode === "none" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleMitigationModeChange("none")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={mitigationMode === "none"}
                          >
                            No Mitigation
                          </Button>
                          <Button
                            type="button"
                            variant={mitigationMode === "forecast" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleMitigationModeChange("forecast")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={mitigationMode === "forecast"}
                          >
                            Forecast Mitigation
                          </Button>
                          <Button
                            type="button"
                            variant={mitigationMode === "active" ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleMitigationModeChange("active")}
                            disabled={readOnly}
                            className="ds-segmented-control__segment"
                            aria-pressed={mitigationMode === "active"}
                          >
                            Active Mitigation
                          </Button>
                        </div>
                      </div>
                    </div>

                    {mitigationMode !== "none" && (
                      <>
                        <div className="mt-6 border-t border-[var(--ds-border-subtle)] pt-6">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="detail-mitigation" className="block">
                                Description
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
                                Mitigation Cost ($)
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
                                Post-Mitigation Probability
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
                                <Label htmlFor="detail-post-cost-min" className="block">Cost Min ($)</Label>
                                <Input id="detail-post-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMin)} onChange={(e) => setPostMitigationCostMin(parseCostInput(e.target.value))} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-cost-ml" className="block">Cost Most Likely ($)</Label>
                                <Input id="detail-post-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostML)} onChange={(e) => setPostMitigationCostML(parseCostInput(e.target.value))} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-cost-max" className="block">Cost Max ($)</Label>
                                <Input id="detail-post-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMax)} onChange={(e) => setPostMitigationCostMax(parseCostInput(e.target.value))} />
                              </div>
                            </div>
                            )}
                            {appliesToAffectsTime(appliesTo) && (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label htmlFor="detail-post-time-min" className="block">Time Min (working days)</Label>
                                <Input id="detail-post-time-min" type="number" min={0} step={1} value={postMitigationTimeMin} onChange={(e) => setPostMitigationTimeMin(e.target.value)} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-time-ml" className="block">Time ML (working days)</Label>
                                <Input id="detail-post-time-ml" type="number" min={0} step={1} value={postMitigationTimeML} onChange={(e) => setPostMitigationTimeML(e.target.value)} />
                              </div>
                              <div>
                                <Label htmlFor="detail-post-time-max" className="block">Time Max (working days)</Label>
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
                aria-label="Restore risk to Open status"
              >
                Restore to Open
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
