"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  appliesToAffectsCost,
  appliesToAffectsTime,
  getDefaultUserCreatedRiskStatusName,
  isRiskStatusArchived,
  isRiskStatusClosed,
  isRiskStatusDraft,
  normalizeAppliesToKey,
  displayedMitigationModeAfterStatusChange,
} from "@/domain/risk/riskFieldSemantics";
import {
  getRiskRegisterRequiredIndicators,
  getRiskRegisterSaveValidationErrors,
  riskRegisterHasMitigationOrPostData,
  shouldShowRiskRegisterMitigationFields,
} from "@/domain/risk/riskRegisterSaveValidation";
import { dlog } from "@/lib/debug";
import type { MitigationMode, Risk, RiskStatus, AppliesTo } from "@/domain/risk/risk.schema";
import { createRisk } from "@/domain/risk/risk.factory";
import { mergeMitigationProfileForMode, modellingInputProfileFromMode, mitigationModeFromInputProfile } from "@/domain/risk/mitigationMode";
import type { ModellingInputProfile } from "@/domain/risk/mitigationMode";
import {
  buildRating,
  probabilityPctToScale,
  consequenceScaleFromAppliesTo,
} from "@/domain/risk/risk.logic";
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
import { useRiskCategoryOptions } from "./RiskCategoryOptionsContext";
import { useRiskStatusOptions } from "./RiskStatusOptionsContext";
import {
  RiskCategoryPicker,
  getResolvedCategoryPickerValue,
  shouldPersistNewCategoryOnSubmit,
} from "./RiskCategoryPicker";
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
  const [categorySelect, setCategorySelect] = useState("");
  const [categoryNewDraft, setCategoryNewDraft] = useState("");
  const { statuses, loading: statusesLoading } = useRiskStatusOptions();
  const { createProjectOwner } = useRiskProjectOwners();
  const { createRiskCategory } = useRiskCategoryOptions();
  const [ownerSelect, setOwnerSelect] = useState("");
  const [ownerNewDraft, setOwnerNewDraft] = useState("");
  const [status, setStatus] = useState<RiskStatus>("");
  const [closureNote, setClosureNote] = useState("");
  const [mitigationMode, setMitigationMode] = useState<MitigationMode>("none");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("");
  const [preMitigationProbabilityPct, setPreMitigationProbabilityPct] = useState("");
  const [preMitigationCostMin, setPreMitigationCostMin] = useState("");
  const [preMitigationCostML, setPreMitigationCostML] = useState("");
  const [preMitigationCostMax, setPreMitigationCostMax] = useState("");
  const [preMitigationTimeMin, setPreMitigationTimeMin] = useState("");
  const [preMitigationTimeML, setPreMitigationTimeML] = useState("");
  const [preMitigationTimeMax, setPreMitigationTimeMax] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [mitigationCost, setMitigationCost] = useState("");
  const [postMitigationProbabilityPct, setPostMitigationProbabilityPct] = useState("");
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
    setCategorySelect("");
    setCategoryNewDraft("");
    setOwnerSelect("");
    setOwnerNewDraft("");
    setStatus("");
    setClosureNote("");
    setMitigationMode("none");
    setAppliesTo("");
    setPreMitigationProbabilityPct("");
    setPreMitigationCostMin("");
    setPreMitigationCostML("");
    setPreMitigationCostMax("");
    setPreMitigationTimeMin("");
    setPreMitigationTimeML("");
    setPreMitigationTimeMax("");
    setMitigation("");
    setMitigationCost("");
    setPostMitigationProbabilityPct("");
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

  /** Input profile only — never mutates canonical lifecycle status. */
  const handleInputProfileChange = useCallback(
    (profile: ModellingInputProfile) => {
      setMitigationMode((prev) =>
        mitigationModeFromInputProfile(profile, { status, previousMode: prev })
      );
    },
    [status]
  );

  /** Status is lifecycle authority; Mitigating defaults display to Post, Open/Monitoring preserve selection. */
  const handleLifecycleStatusChange = useCallback((next: string) => {
    setStatus(next as RiskStatus);
    if (isRiskStatusClosed(next) || isRiskStatusArchived(next)) return;
    setMitigationMode((prev) => displayedMitigationModeAfterStatusChange(next, prev));
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
      if (isRiskStatusClosed(status) && !closureNote.trim()) {
        setValidationErrors(["A closure note is required when closing a risk."]);
        return;
      }
      const ownerResolved = getResolvedOwnerPickerValue(ownerSelect, ownerNewDraft);
      const categoryResolved = getResolvedCategoryPickerValue(
        categorySelect,
        categoryNewDraft
      );
      const errors = getRiskRegisterSaveValidationErrors({
        status,
        title,
        description,
        category: categoryResolved,
        ownerResolved: ownerResolved ?? "",
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
        setValidationErrors(errors);
        return;
      }
      setValidationErrors([]);
      let categoryToSave = categoryResolved;
      if (shouldPersistNewCategoryOnSubmit(categorySelect) && categoryResolved) {
        try {
          const canonical = await createRiskCategory(categoryResolved);
          if (canonical) categoryToSave = canonical;
        } catch (err) {
          setValidationErrors([
            err instanceof Error ? err.message : "Could not save new category. Try again.",
          ]);
          return;
        }
      }
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
      const prePct = parseNum(preMitigationProbabilityPct);
      const preCostML = parseNum(preMitigationCostML);
      const preTimeML = parseIntNum(preMitigationTimeML);
      const postPct = parseNum(postMitigationProbabilityPct);
      const postCostMLParsed = parseNum(postMitigationCostML);
      const postTimeMLParsed = parseIntNum(postMitigationTimeML);
      const applies = appliesTo;
      const preP = prePct != null ? probabilityPctToScale(prePct) : 1;
      const preC = consequenceScaleFromAppliesTo(applies, preCostML ?? 0, preTimeML ?? 0);
      const inherentRating = buildRating(preP, preC);
      const residualRating =
        postPct != null
          ? buildRating(
              probabilityPctToScale(postPct),
              consequenceScaleFromAppliesTo(applies, postCostMLParsed ?? 0, postTimeMLParsed ?? 0)
            )
          : inherentRating;
      const riskBase = createRisk({
        title: title.trim() || "Untitled risk",
        description: description.trim() || undefined,
        category: categoryToSave,
        status,
        closureNote: isRiskStatusClosed(status) ? closureNote.trim() : undefined,
        owner: ownerResolved || undefined,
        appliesTo: applies,
        preMitigationCostMin: parseNum(preMitigationCostMin),
        preMitigationCostML: preCostML,
        preMitigationCostMax: parseNum(preMitigationCostMax),
        preMitigationTimeMin: parseIntNum(preMitigationTimeMin),
        preMitigationTimeML: preTimeML,
        preMitigationTimeMax: parseIntNum(preMitigationTimeMax),
        // Always persist mitigation/post form values — mode must not clear planned data.
        mitigation: mitigation.trim() || undefined,
        mitigationCost: parseNum(mitigationCost),
        postMitigationCostMin: parseNum(postMitigationCostMin),
        postMitigationCostML: postCostMLParsed,
        postMitigationCostMax: parseNum(postMitigationCostMax),
        postMitigationTimeMin: parseIntNum(postMitigationTimeMin),
        postMitigationTimeML: postTimeMLParsed,
        postMitigationTimeMax: parseIntNum(postMitigationTimeMax),
        preMitigationProbabilityPct: prePct,
        postMitigationProbabilityPct: postPct,
        inherentRating,
        residualRating,
        probability:
          mitigationMode !== "none" && postPct != null
            ? postPct / 100
            : prePct != null
              ? prePct / 100
              : undefined,
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
      categorySelect,
      categoryNewDraft,
      status,
      closureNote,
      mitigationMode,
      ownerSelect,
      ownerNewDraft,
      createProjectOwner,
      createRiskCategory,
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
              New
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
                  {isRiskStatusClosed(status) && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="add-risk-closure-note" className="block">
                        Closure note <span className="text-[var(--ds-status-danger-fg)]" aria-label="required">*</span>
                      </Label>
                      <Textarea
                        id="add-risk-closure-note"
                        value={closureNote}
                        onChange={(e) => setClosureNote(e.target.value)}
                        rows={3}
                        placeholder="Why this risk is being closed"
                        aria-required
                      />
                    </div>
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
                      Risk Description {requiredIndicators.assessmentBasics && <RequiredStar />}
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
                        Category {requiredIndicators.assessmentBasics && <RequiredStar />}
                      </Label>
                      <RiskCategoryPicker
                        id="add-risk-category"
                        selectValue={categorySelect}
                        newNameDraft={categoryNewDraft}
                        onSelectChange={setCategorySelect}
                        onNewNameDraftChange={setCategoryNewDraft}
                        allowEmptyPlaceholder
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-risk-owner" className="block">
                        Risk Manager {requiredIndicators.assessmentBasics && <RequiredStar />}
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
                        <Label htmlFor="add-risk-pre-cost-min" className="block">Cost Min ($) {requiredIndicators.preCost && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMin)} onChange={(e) => setPreMitigationCostMin(parseCostInput(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-cost-ml" className="block">Cost Most Likely ($) {requiredIndicators.preCost && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostML)} onChange={(e) => setPreMitigationCostML(parseCostInput(e.target.value))} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-cost-max" className="block">Cost Max ($) {requiredIndicators.preCost && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(preMitigationCostMax)} onChange={(e) => setPreMitigationCostMax(parseCostInput(e.target.value))} />
                      </div>
                    </div>
                    )}
                    {appliesToAffectsTime(appliesTo) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="add-risk-pre-time-min" className="block">Time Min (working days) {requiredIndicators.preTime && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-time-min" type="number" min={0} step={1} value={preMitigationTimeMin} onChange={(e) => setPreMitigationTimeMin(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-time-ml" className="block">Time ML (working days) {requiredIndicators.preTime && <RequiredStar />}</Label>
                        <Input id="add-risk-pre-time-ml" type="number" min={0} step={1} value={preMitigationTimeML} onChange={(e) => setPreMitigationTimeML(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="add-risk-pre-time-max" className="block">Time Max (working days) {requiredIndicators.preTime && <RequiredStar />}</Label>
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
                    <Label className="block mb-2">Input profile</Label>
                    <div className="ds-segmented-control" role="group" aria-label="Input profile">
                      <Button
                        type="button"
                        variant={inputProfile === "pre" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => handleInputProfileChange("pre")}
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
                          <Label htmlFor="add-risk-mitigation" className="block">
                            Description {requiredIndicators.mitigationDescription && <RequiredStar />}
                          </Label>
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
                          <Label htmlFor="add-risk-mitigation-cost" className="block">
                            Mitigation Cost ($) {requiredIndicators.mitigationCost && <RequiredStar />}
                          </Label>
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
                          <Label htmlFor="add-risk-post-prob" className="block">
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
                            <Label htmlFor="add-risk-post-cost-min" className="block">Cost Min ($) {requiredIndicators.postCost && <RequiredStar />}</Label>
                            <Input id="add-risk-post-cost-min" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMin)} onChange={(e) => setPostMitigationCostMin(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-cost-ml" className="block">Cost Most Likely ($) {requiredIndicators.postCost && <RequiredStar />}</Label>
                            <Input id="add-risk-post-cost-ml" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostML)} onChange={(e) => setPostMitigationCostML(parseCostInput(e.target.value))} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-cost-max" className="block">Cost Max ($) {requiredIndicators.postCost && <RequiredStar />}</Label>
                            <Input id="add-risk-post-cost-max" type="text" inputMode="numeric" value={formatCostDisplay(postMitigationCostMax)} onChange={(e) => setPostMitigationCostMax(parseCostInput(e.target.value))} />
                          </div>
                        </div>
                        )}
                        {appliesToAffectsTime(appliesTo) && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="add-risk-post-time-min" className="block">Time Min (working days) {requiredIndicators.postTime && <RequiredStar />}</Label>
                            <Input id="add-risk-post-time-min" type="number" min={0} step={1} value={postMitigationTimeMin} onChange={(e) => setPostMitigationTimeMin(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-time-ml" className="block">Time ML (working days) {requiredIndicators.postTime && <RequiredStar />}</Label>
                            <Input id="add-risk-post-time-ml" type="number" min={0} step={1} value={postMitigationTimeML} onChange={(e) => setPostMitigationTimeML(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="add-risk-post-time-max" className="block">Time Max (working days) {requiredIndicators.postTime && <RequiredStar />}</Label>
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
