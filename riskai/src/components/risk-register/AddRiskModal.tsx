"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Risk, RiskStatus, AppliesTo } from "@/domain/risk/risk.schema";
import { createRisk } from "@/domain/risk/risk.factory";
import {
  buildRating,
  probabilityPctToScale,
  consequenceScaleFromAppliesTo,
} from "@/domain/risk/risk.logic";
import {
  appliesToAffectsCost,
  appliesToAffectsTime,
  getDefaultUserCreatedRiskStatusName,
  isRiskStatusDraft,
} from "@/domain/risk/riskFieldSemantics";
import { dlog } from "@/lib/debug";
import {
  Button,
  Callout,
  Input,
  Label,
  Textarea,
} from "@visualify/design-system";
import { useRiskAppliesToOptions } from "./RiskAppliesToOptionsContext";
import { useRiskProjectOwners } from "./RiskProjectOwnersContext";
import { useRiskStatusOptions } from "./RiskStatusOptionsContext";
import { RiskAppliesToSelect } from "./RiskAppliesToSelect";
import { RiskCategorySelect } from "./RiskCategorySelect";
import {
  RiskOwnerPicker,
  getResolvedOwnerPickerValue,
  shouldPersistNewOwnerOnSubmit,
} from "./RiskOwnerPicker";
import { RiskStatusSelect } from "./RiskStatusSelect";

/** Native `<select>` / special inputs: matches design-system Form field chrome (no exported primitive). */
const nativeSelectClass =
  "w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 h-9 py-1 " +
  "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] transition-colors duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)]";

function RequiredStar() {
  return <span className="text-[var(--ds-status-danger-fg)]" aria-label="required">*</span>;
}

/** Mirror of RiskDetailModal validateNonDraftRisk for AddRiskModal form. applyMitigation = mitigation text provided. */
function validateAddRiskNonDraft(form: {
  status: RiskStatus;
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
  const applyMitigation = !!form.mitigation.trim();
  if (!form.title.trim()) errors.push("Title");
  if (!form.description.trim()) errors.push("Description");
  if (!form.category.trim()) errors.push("Category");
  const ownerResolved = getResolvedOwnerPickerValue(form.ownerSelect, form.ownerNewDraft);
  if (!ownerResolved) errors.push("Owner");
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
  if (applyMitigation) {
    if (!form.mitigation.trim()) errors.push("Mitigation description");
    const postPct = parseFloat(form.postMitigationProbabilityPct);
    if (!Number.isFinite(postPct) || postPct < 0 || postPct > 100) errors.push("Post-Mitigation Probability %");
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
  const { appliesToOptions, loading: appliesToOptionsLoading } = useRiskAppliesToOptions();
  const defaultAppliesToName = appliesToOptions[0]?.name ?? "both";
  const { createProjectOwner } = useRiskProjectOwners();
  const [ownerSelect, setOwnerSelect] = useState("");
  const [ownerNewDraft, setOwnerNewDraft] = useState("");
  const [status, setStatus] = useState<RiskStatus>("");
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
    if (!open || appliesToOptionsLoading) return;
    setAppliesTo((prev: string) => (prev === "" ? defaultAppliesToName : prev));
  }, [open, appliesToOptionsLoading, defaultAppliesToName]);

  useEffect(() => {
    if (!open) return;
    dlog("[add risk] form defaults snapshot", {
      category: "(blank until user selects)",
      statusAfterOptions: getDefaultUserCreatedRiskStatusName(statuses) || "(pending)",
      ownerSelect: "",
    });
  }, [open, statuses]);

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
      const applyMitigation = !!mitigation.trim();
      const prePct = parseNum(preMitigationProbabilityPct) ?? 50;
      const postPct = applyMitigation ? (parseNum(postMitigationProbabilityPct) ?? 50) : prePct;
      const preCostML = parseNum(preMitigationCostML) ?? 0;
      const preTimeML = parseIntNum(preMitigationTimeML) ?? 0;
      const postCostML = applyMitigation ? (parseNum(postMitigationCostML) ?? preCostML) : preCostML;
      const postTimeML = applyMitigation ? (parseIntNum(postMitigationTimeML) ?? preTimeML) : preTimeML;
      const applies = appliesTo;
      const preP = probabilityPctToScale(prePct);
      const preC = consequenceScaleFromAppliesTo(applies, preCostML, preTimeML);
      const postP = probabilityPctToScale(postPct);
      const postC = consequenceScaleFromAppliesTo(applies, postCostML, postTimeML);
      const inherentRating = buildRating(preP, preC);
      const residualRating = buildRating(postP, postC);
      const risk = createRisk({
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
        mitigation: applyMitigation ? (mitigation.trim() || undefined) : undefined,
        mitigationCost: applyMitigation ? (parseNum(mitigationCost) ?? undefined) : undefined,
        postMitigationCostMin: applyMitigation ? parseNum(postMitigationCostMin) : undefined,
        postMitigationCostML: applyMitigation ? (postCostML ?? undefined) : undefined,
        postMitigationCostMax: applyMitigation ? parseNum(postMitigationCostMax) : undefined,
        postMitigationTimeMin: applyMitigation ? parseIntNum(postMitigationTimeMin) : undefined,
        postMitigationTimeML: applyMitigation ? (postTimeML ?? undefined) : undefined,
        postMitigationTimeMax: applyMitigation ? parseIntNum(postMitigationTimeMax) : undefined,
        inherentRating,
        residualRating,
        probability: (applyMitigation ? postPct : prePct) / 100,
      });
      onAdd(risk);
      onClose();
    },
    [
      title,
      description,
      category,
      status,
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

  const overlayScrimClass =
    "fixed inset-0 z-50 flex items-center justify-center p-4 relative " +
    "bg-[var(--ds-overlay)] backdrop-blur-sm";

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
        className="w-full max-w-[70vw] max-h-[90vh] shrink-0 rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)] min-h-[400px] min-w-[280px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: title + close */}
        <div className="flex items-center justify-between gap-4 shrink-0 border-b border-[var(--ds-border)] px-4 sm:px-6 py-3">
          <h2
            id="add-risk-dialog-title"
            className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]"
          >
            Add risk
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="h-9 w-9 shrink-0 p-0"
            aria-label="Close dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--ds-text-primary)]"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5 space-y-6">
            {validationErrors.length > 0 && (
              <Callout status="danger" role="alert">
                <p className="font-medium mb-1 text-[length:var(--ds-text-sm)]">Complete all required fields before adding (non-draft risks):</p>
                <ul className="list-disc list-inside text-[length:var(--ds-text-sm)] space-y-0.5">{validationErrors.map((err) => <li key={err}>{err}</li>)}</ul>
              </Callout>
            )}
            {/* General */}
            <section>
              <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">General</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="add-risk-title" className="block">
                    Title <RequiredStar />
                  </Label>
                  <Input id="add-risk-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Long lead switchgear" required />
                </div>
                <div>
                  <Label htmlFor="add-risk-description" className="block">Description</Label>
                  <Textarea
                    id="add-risk-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px]"
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="add-risk-category" className="block">Category</Label>
                    <RiskCategorySelect
                      id="add-risk-category"
                      value={category}
                      onChange={setCategory}
                      className={nativeSelectClass}
                      allowEmptyPlaceholder
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-owner" className="block">
                      Owner {!isRiskStatusDraft(status) && <RequiredStar />}
                    </Label>
                    <RiskOwnerPicker
                      id="add-risk-owner"
                      selectValue={ownerSelect}
                      newNameDraft={ownerNewDraft}
                      onSelectChange={setOwnerSelect}
                      onNewNameDraftChange={setOwnerNewDraft}
                      className={nativeSelectClass}
                      allowEmptyPlaceholder
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-status" className="block">Status</Label>
                    <RiskStatusSelect
                      id="add-risk-status"
                      value={status}
                      onChange={setStatus}
                      className={nativeSelectClass}
                      allowEmptyPlaceholder
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-applies-to" className="block">Applies To</Label>
                    <RiskAppliesToSelect
                      id="add-risk-applies-to"
                      value={appliesTo}
                      onChange={setAppliesTo}
                      className={nativeSelectClass}
                      allowEmptyPlaceholder
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Pre-Mitigation */}
            <section>
              <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">Pre-Mitigation</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="add-risk-pre-prob" className="block">Probability %</Label>
                  <Input id="add-risk-pre-prob" type="number" min={0} max={100} step={1} value={preMitigationProbabilityPct} onChange={(e) => setPreMitigationProbabilityPct(e.target.value)} placeholder="0–100" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="add-risk-pre-cost-min" className="block">Cost Min ($)</Label>
                    <Input id="add-risk-pre-cost-min" type="number" min={0} step={1000} value={preMitigationCostMin} onChange={(e) => setPreMitigationCostMin(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-pre-cost-ml" className="block">Cost Most Likely ($)</Label>
                    <Input id="add-risk-pre-cost-ml" type="number" min={0} step={1000} value={preMitigationCostML} onChange={(e) => setPreMitigationCostML(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-pre-cost-max" className="block">Cost Max ($)</Label>
                    <Input id="add-risk-pre-cost-max" type="number" min={0} step={1000} value={preMitigationCostMax} onChange={(e) => setPreMitigationCostMax(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="add-risk-pre-time-min" className="block">Time Min (days)</Label>
                    <Input id="add-risk-pre-time-min" type="number" min={0} step={1} value={preMitigationTimeMin} onChange={(e) => setPreMitigationTimeMin(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-pre-time-ml" className="block">Time ML (days)</Label>
                    <Input id="add-risk-pre-time-ml" type="number" min={0} step={1} value={preMitigationTimeML} onChange={(e) => setPreMitigationTimeML(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-pre-time-max" className="block">Time Max (days)</Label>
                    <Input id="add-risk-pre-time-max" type="number" min={0} step={1} value={preMitigationTimeMax} onChange={(e) => setPreMitigationTimeMax(e.target.value)} />
                  </div>
                </div>
              </div>
            </section>

            {/* Mitigation */}
            <section>
              <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">Mitigation</h3>
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
                  <Input id="add-risk-mitigation-cost" type="number" min={0} step={1000} value={mitigationCost} onChange={(e) => setMitigationCost(e.target.value)} placeholder="—" />
                </div>
              </div>
            </section>

            {/* Post-Mitigation */}
            <section>
              <h3 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] mb-3">Post-Mitigation</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="add-risk-post-prob" className="block">Probability %</Label>
                  <Input id="add-risk-post-prob" type="number" min={0} max={100} step={1} value={postMitigationProbabilityPct} onChange={(e) => setPostMitigationProbabilityPct(e.target.value)} placeholder="0–100" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="add-risk-post-cost-min" className="block">Cost Min ($)</Label>
                    <Input id="add-risk-post-cost-min" type="number" min={0} step={1000} value={postMitigationCostMin} onChange={(e) => setPostMitigationCostMin(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-post-cost-ml" className="block">Cost Most Likely ($)</Label>
                    <Input id="add-risk-post-cost-ml" type="number" min={0} step={1000} value={postMitigationCostML} onChange={(e) => setPostMitigationCostML(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-risk-post-cost-max" className="block">Cost Max ($)</Label>
                    <Input id="add-risk-post-cost-max" type="number" min={0} step={1000} value={postMitigationCostMax} onChange={(e) => setPostMitigationCostMax(e.target.value)} />
                  </div>
                </div>
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
              </div>
            </section>
          </div>
          <div className="flex flex-wrap justify-end gap-3 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" size="md">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}
