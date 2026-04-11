"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MitigationMode, Risk, RiskStatus, AppliesTo } from "@/domain/risk/risk.schema";
import { createRisk } from "@/domain/risk/risk.factory";
import { mergeMitigationProfileForMode } from "@/domain/risk/mitigationMode";
import {
  buildRating,
  probabilityPctToScale,
  consequenceScaleFromAppliesTo,
} from "@/domain/risk/risk.logic";
import {
  appliesToAffectsCost,
  appliesToAffectsTime,
  findRiskStatusNameByKeys,
  getDefaultUserCreatedRiskStatusName,
  isRiskStatusArchived,
  isRiskStatusClosed,
  isRiskStatusDraft,
  normalizeAppliesToKey,
  normalizeRiskStatusKey,
  statusAutoFromMitigationMode,
} from "@/domain/risk/riskFieldSemantics";
import { dlog } from "@/lib/debug";
import {
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
import { useRiskStatusOptions } from "./RiskStatusOptionsContext";
import { RiskCategorySelect } from "./RiskCategorySelect";
import {
  RiskOwnerPicker,
  getResolvedOwnerPickerValue,
  shouldPersistNewOwnerOnSubmit,
} from "./RiskOwnerPicker";
import { RiskStatusSelect } from "./RiskStatusSelect";

const rangeTrackClass =
  "col-span-2 min-w-0 h-2 rounded-[var(--ds-radius-sm)] appearance-none bg-[var(--ds-surface-muted)] accent-[var(--ds-primary)]";

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

function RequiredStar() {
  return <span className="text-[var(--ds-status-danger-fg)]" aria-label="required">*</span>;
}

/** Mirror of RiskDetailModal validateNonDraftRisk for AddRiskModal form. */
function validateAddRiskNonDraft(form: {
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
  const persistMitigation = form.mitigationMode !== "none";
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
    if (form.preMitigationTimeMin.trim() === "" || !Number.isFinite(preTimeMin) || preTimeMin < 0) errors.push("Pre-Mitigation Time Min");
    const v = parseInt(form.preMitigationTimeML, 10);
    if (!Number.isFinite(v) || v < 0) errors.push("Pre-Mitigation Time ML (days)");
    const preTimeMax = parseInt(form.preMitigationTimeMax, 10);
    if (form.preMitigationTimeMax.trim() === "" || !Number.isFinite(preTimeMax) || preTimeMax < 0) errors.push("Pre-Mitigation Time Max");
  }
  if (persistMitigation) {
    if (!form.mitigation.trim()) errors.push("Mitigation description");
    const postPct = parseFloat(form.postMitigationProbabilityPct);
    if (!Number.isFinite(postPct) || postPct < 0 || postPct > 100) errors.push("Post-Mitigation Probability");
    if (appliesToAffectsCost(form.appliesTo)) {
      const postCostMin = parseFloat(form.postMitigationCostMin);
      if (form.postMitigationCostMin.trim() === "" || !Number.isFinite(postCostMin) || postCostMin < 0) errors.push("Post-Mitigation Cost Min");
      const v = parseFloat(form.postMitigationCostML);
      if (!Number.isFinite(v) || v < 0) errors.push("Post-Mitigation Cost Most Likely");
      const postCostMax = parseFloat(form.postMitigationCostMax);
      if (form.postMitigationCostMax.trim() === "" || !Number.isFinite(postCostMax) || postCostMax < 0) errors.push("Post-Mitigation Cost Max");
    }
    if (appliesToAffectsTime(form.appliesTo)) {
      const postTimeMin = parseInt(form.postMitigationTimeMin, 10);
      if (form.postMitigationTimeMin.trim() === "" || !Number.isFinite(postTimeMin) || postTimeMin < 0) errors.push("Post-Mitigation Time Min");
      const v = parseInt(form.postMitigationTimeML, 10);
      if (!Number.isFinite(v) || v < 0) errors.push("Post-Mitigation Time ML (days)");
      const postTimeMax = parseInt(form.postMitigationTimeMax, 10);
      if (form.postMitigationTimeMax.trim() === "" || !Number.isFinite(postTimeMax) || postTimeMax < 0) errors.push("Post-Mitigation Time Max");
    }
  }
  return errors;
}

export function AddRiskModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (risk: Risk) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const { statuses, loading: statusesLoading } = useRiskStatusOptions();
  const { createProjectOwner } = useRiskProjectOwners();
  const [ownerSelect, setOwnerSelect] = useState("");
  const [ownerNewDraft, setOwnerNewDraft] = useState("");
  const [status, setStatus] = useState<RiskStatus>("");
  const [mitigationMode, setMitigationMode] = useState<MitigationMode>("none");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("");
  const [preMitigationProbabilityPct, setPreMitigationProbabilityPct] = useState("50");
  const [preMitigationCostMin, setPreMitigationCostMin] = useState("");
  const [preMitigationCostML, setPreMitigationCostML] = useState("");
  const [preMitigationCostMax, setPreMitigationCostMax] = useState("");
  const [preMitigationTimeMin, setPreMitigationTimeMin] = useState("");
  const [preMitigationTimeML, setPreMitigationTimeML] = useState("");
  const [preMitigationTimeMax, setPreMitigationTimeMax] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [mitigationCost, setMitigationCost] = useState("");
  const [postMitigationProbabilityPct, setPostMitigationProbabilityPct] = useState("50");
  const [postMitigationCostMin, setPostMitigationCostMin] = useState("");
  const [postMitigationCostML, setPostMitigationCostML] = useState("");
  const [postMitigationCostMax, setPostMitigationCostMax] = useState("");
  const [postMitigationTimeMin, setPostMitigationTimeMin] = useState("");
  const [postMitigationTimeML, setPostMitigationTimeML] = useState("");
  const [postMitigationTimeMax, setPostMitigationTimeMax] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !modalRef.current) return;
    const el = modalRef.current;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first) first.focus();
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setCategory("");
    setOwnerSelect("");
    setOwnerNewDraft("");
    setStatus("");
    setMitigationMode("none");
    setAppliesTo("");
    setPreMitigationProbabilityPct("50");
    setPreMitigationCostMin("");
    setPreMitigationCostML("");
    setPreMitigationCostMax("");
    setPreMitigationTimeMin("");
    setPreMitigationTimeML("");
    setPreMitigationTimeMax("");
    setMitigation("");
    setMitigationCost("");
    setPostMitigationProbabilityPct("50");
    setPostMitigationCostMin("");
    setPostMitigationCostML("");
    setPostMitigationCostMax("");
    setPostMitigationTimeMin("");
    setPostMitigationTimeML("");
    setPostMitigationTimeMax("");
    setValidationErrors([]);
  }, [open]);

  useEffect(() => {
    if (!open || statusesLoading) return;
    setStatus((prev: string) => {
      if (prev !== "") return prev;
      const openName = getDefaultUserCreatedRiskStatusName(statuses);
      dlog("[add risk] default status after options load", openName || "(none)");
      return (openName || "open") as RiskStatus;
    });
  }, [open, statusesLoading, statuses]);

  useEffect(() => {
    if (!open) return;
    setAppliesTo((prev: string) => (prev === "" ? "both" : prev));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    dlog("[add risk] form defaults snapshot", {
      category: "(blank until user selects)",
      statusAfterOptions: getDefaultUserCreatedRiskStatusName(statuses) || "(pending)",
      ownerSelect: "",
    });
  }, [open, statuses]);

  const handleMitigationModeChange = useCallback(
    (next: MitigationMode) => {
      setMitigationMode(next);
      if (isRiskStatusClosed(status) || isRiskStatusArchived(status)) return;
      if (next === "none") {
        if (isRiskStatusDraft(status)) return;
        const openName = findRiskStatusNameByKeys(statuses, ["open"]);
        if (openName) setStatus(openName);
        return;
      }
      const auto = statusAutoFromMitigationMode(next, statuses);
      if (auto) setStatus(auto);
    },
    [status, statuses]
  );

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errors = validateAddRiskNonDraft({
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
        setValidationErrors(errors);
        return;
      }
      setValidationErrors([]);
      const categoryToSave = category.trim();
      const ownerResolved = getResolvedOwnerPickerValue(ownerSelect, ownerNewDraft);
      if (shouldPersistNewOwnerOnSubmit(ownerSelect) && ownerResolved) {
        try {
          await createProjectOwner(ownerResolved);
        } catch (err) {
          setValidationErrors([
            err instanceof Error ? err.message : "Could not save new owner. Try again.",
          ]);
          return;
        }
      }
      dlog("[risk save] category", categoryToSave, "status", status, "appliesTo", appliesTo);
      const persistMitigationFields = mitigationMode !== "none";
      const prePct = parseNum(preMitigationProbabilityPct) ?? 50;
      const postPct = persistMitigationFields ? (parseNum(postMitigationProbabilityPct) ?? 50) : prePct;
      const preCostML = parseNum(preMitigationCostML) ?? 0;
      const preTimeML = parseIntNum(preMitigationTimeML) ?? 0;
      const postCostML = persistMitigationFields ? (parseNum(postMitigationCostML) ?? preCostML) : preCostML;
      const postTimeML = persistMitigationFields ? (parseIntNum(postMitigationTimeML) ?? preTimeML) : preTimeML;
      const applies = appliesTo;
      const preP = probabilityPctToScale(prePct);
      const preC = consequenceScaleFromAppliesTo(applies, preCostML, preTimeML);
      const postP = probabilityPctToScale(postPct);
      const postC = consequenceScaleFromAppliesTo(applies, postCostML, postTimeML);
      const inherentRating = buildRating(preP, preC);
      const residualRating = buildRating(postP, postC);
      const riskBase = createRisk({
        title: title.trim() || "Untitled risk",
        description: description.trim() || undefined,
        category: categoryToSave,
        status,
        owner: ownerResolved || undefined,
        appliesTo: applies,
        preMitigationCostMin: parseNum(preMitigationCostMin),
        preMitigationCostML: preCostML ?? undefined,
        preMitigationCostMax: parseNum(preMitigationCostMax) ?? undefined,
        preMitigationTimeMin: parseIntNum(preMitigationTimeMin),
        preMitigationTimeML: preTimeML ?? undefined,
        preMitigationTimeMax: parseIntNum(preMitigationTimeMax) ?? undefined,
        mitigation: persistMitigationFields ? (mitigation.trim() || undefined) : undefined,
        mitigationCost: persistMitigationFields ? (parseNum(mitigationCost) ?? undefined) : undefined,
        postMitigationCostMin: persistMitigationFields ? parseNum(postMitigationCostMin) : undefined,
        postMitigationCostML: persistMitigationFields ? (postCostML ?? undefined) : undefined,
        postMitigationCostMax: persistMitigationFields ? parseNum(postMitigationCostMax) : undefined,
        postMitigationTimeMin: persistMitigationFields ? parseIntNum(postMitigationTimeMin) : undefined,
        postMitigationTimeML: persistMitigationFields ? (postTimeML ?? undefined) : undefined,
        postMitigationTimeMax: persistMitigationFields ? parseIntNum(postMitigationTimeMax) : undefined,
        inherentRating,
        residualRating,
        probability: (persistMitigationFields ? postPct : prePct) / 100,
      });
      const risk: Risk = {
        ...riskBase,
        mitigationProfile: mergeMitigationProfileForMode(riskBase, mitigationMode),
      };
      onAdd(risk);
      onClose();
    },
    [
      title,
      description,
      category,
      status,
      mitigationMode,
      ownerSelect,
      ownerNewDraft,
      createProjectOwner,
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
      onAdd,
      onClose,
    ]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlayScrimClass = "ds-modal-backdrop z-[100]";

  const overlay = (
    <div
      className={overlayScrimClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-risk-dialog-title"
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
            <span
              className="w-14 shrink-0 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-muted)]"
              aria-label="Risk ID"
            >
              —
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={
                "flex-1 min-w-0 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)] bg-transparent " +
                "border border-transparent rounded-[var(--ds-radius-md)] px-1.5 py-0.5 " +
                "hover:border-[var(--ds-border)] " +
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
                "focus-visible:border-[var(--ds-border)]"
              }
              aria-label="Risk title"
              id="add-risk-dialog-title"
              placeholder="e.g. Long lead switchgear"
            />
            <RiskStatusSelect
              id="add-risk-header-status"
              value={status}
              onChange={handleLifecycleStatusChange}
              allowEmptyPlaceholder
              className="!h-9 max-w-[13rem] min-w-[8.5rem] shrink-0 py-1 text-[length:var(--ds-text-sm)]"
              title="Lifecycle status"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[var(--ds-radius-sm)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)] transition-colors shrink-0"
            aria-label="Close"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col">
            <div className="space-y-6">
            {validationErrors.length > 0 && (
              <Callout status="danger" role="alert">
                <p className="font-medium mb-1 text-[length:var(--ds-text-sm)]">Complete all required fields before adding (non-draft risks):</p>
                <ul className="list-disc list-inside text-[length:var(--ds-text-sm)] space-y-0.5">{validationErrors.map((err) => <li key={err}>{err}</li>)}</ul>
              </Callout>
            )}
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
                    <Label className="block mb-2">Applies To</Label>
                    <div className="ds-segmented-control" role="group" aria-label="Applies to">
                      <Button
                        type="button"
                        variant={normalizeAppliesToKey(appliesTo) !== "cost" && normalizeAppliesToKey(appliesTo) !== "time" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setAppliesTo("both")}
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
                        className="ds-segmented-control__segment"
                        aria-pressed={normalizeAppliesToKey(appliesTo) === "time"}
                      >
                        Time
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="add-risk-description" className="block">
                      Risk Description {!isRiskStatusDraft(status) && <RequiredStar />}
                    </Label>
                    <Textarea
                      id="add-risk-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="Include a detailed description of the risk."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-risk-category" className="block">
                        Category {!isRiskStatusDraft(status) && <RequiredStar />}
                      </Label>
                      <RiskCategorySelect
                        id="add-risk-category"
                        value={category}
                        onChange={setCategory}
                        allowEmptyPlaceholder
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-risk-owner" className="block">
                        Risk Manager {!isRiskStatusDraft(status) && <RequiredStar />}
                      </Label>
                      <RiskOwnerPicker
                        id="add-risk-owner"
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
                  <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">Pre-Mitigation</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="add-risk-pre-prob" className="block">
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
                          id="add-risk-pre-prob"
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
                        <Label htmlFor="add-risk-pre-cost-min" className="block">Cost Min ($) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMin)} onChange={(e) => setPreMitigationCostMin(parseCostInput(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-cost-ml" className="block">Cost Most Likely ($) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostML)} onChange={(e) => setPreMitigationCostML(parseCostInput(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-cost-max" className="block">Cost Max ($) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMax)} onChange={(e) => setPreMitigationCostMax(parseCostInput(e.target.value))} />
                      </div>
                    </div>
                    )}
                    {appliesToAffectsTime(appliesTo) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="add-risk-pre-time-min" className="block">Time Min (days) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-time-min" type="number" min={0} step={1} value={preMitigationTimeMin} onChange={(e) => setPreMitigationTimeMin(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-time-ml" className="block">Time ML (days) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-time-ml" type="number" min={0} step={1} value={preMitigationTimeML} onChange={(e) => setPreMitigationTimeML(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-time-max" className="block">Time Max (days) {!isRiskStatusDraft(status) && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-time-max" type="number" min={0} step={1} value={preMitigationTimeMax} onChange={(e) => setPreMitigationTimeMax(e.target.value)} />
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="ds-risk-detail-section-card">
              <CardHeader className="ds-risk-detail-card-header">
                <h2 className="ds-risk-detail-card-title">Mitigation</h2>
              </CardHeader>
              <CardBody className="ds-risk-detail-card-body">
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <Label className="block mb-2">Mitigation Status</Label>
                    <div className="ds-segmented-control" role="group" aria-label="Mitigation status">
                      <Button
                        type="button"
                        variant={mitigationMode === "none" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => handleMitigationModeChange("none")}
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
                          <Label htmlFor="add-risk-mitigation" className="block">Description</Label>
                          <Textarea
                            id="add-risk-mitigation"
                            value={mitigation}
                            onChange={(e) => setMitigation(e.target.value)}
                            className="min-h-[60px]"
                            placeholder="Mitigation strategy"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="add-risk-mitigation-cost" className="block">Mitigation Cost ($)</Label>
                          <Input
                            id="add-risk-mitigation-cost"
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
                          <Label htmlFor="add-risk-post-prob" className="block">Post-Mitigation Probability</Label>
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
                              id="add-risk-post-prob"
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
                            <Label htmlFor="add-risk-post-cost-min" className="block">Cost Min ($)</Label>
                            <Input id="add-risk-post-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMin)} onChange={(e) => setPostMitigationCostMin(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-cost-ml" className="block">Cost Most Likely ($)</Label>
                            <Input id="add-risk-post-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostML)} onChange={(e) => setPostMitigationCostML(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-cost-max" className="block">Cost Max ($)</Label>
                            <Input id="add-risk-post-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMax)} onChange={(e) => setPostMitigationCostMax(parseCostInput(e.target.value))} />
                          </div>
                        </div>
                        )}
                        {appliesToAffectsTime(appliesTo) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="add-risk-post-time-min" className="block">Time Min (days)</Label>
                            <Input id="add-risk-post-time-min" type="number" min={0} step={1} value={postMitigationTimeMin} onChange={(e) => setPostMitigationTimeMin(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-time-ml" className="block">Time ML (days)</Label>
                            <Input id="add-risk-post-time-ml" type="number" min={0} step={1} value={postMitigationTimeML} onChange={(e) => setPostMitigationTimeML(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-time-max" className="block">Time Max (days)</Label>
                            <Input id="add-risk-post-time-max" type="number" min={0} step={1} value={postMitigationTimeMax} onChange={(e) => setPostMitigationTimeMax(e.target.value)} />
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
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] w-full">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" size="md">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}
