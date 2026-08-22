/**
 * Shared Add Risk / Risk Detail save validation + UI required/visibility indicators.
 * Canonical `status` is the authority for mitigation/post requiredness — not mitigation mode or text alone.
 */

import {
  appliesToAffectsCost,
  appliesToAffectsTime,
  isRiskStatusArchived,
  isRiskStatusClosed,
  isRiskStatusDraft,
  normalizeRiskStatusKey,
} from "./riskFieldSemantics";

export type RiskRegisterSaveFormFields = {
  status: string;
  title: string;
  description: string;
  category: string;
  /** Resolved owner display value (empty when unset). */
  ownerResolved: string;
  appliesTo: string;
  preMitigationProbabilityPct: string;
  preMitigationCostMin: string;
  preMitigationCostML: string;
  preMitigationCostMax: string;
  preMitigationTimeMin: string;
  preMitigationTimeML: string;
  preMitigationTimeMax: string;
  mitigation: string;
  mitigationCost: string;
  postMitigationProbabilityPct: string;
  postMitigationCostMin: string;
  postMitigationCostML: string;
  postMitigationCostMax: string;
  postMitigationTimeMin: string;
  postMitigationTimeML: string;
  postMitigationTimeMax: string;
};

/** Asterisk flags for assessment / mitigation / post labels — same rules as save enforcement. */
export type RiskRegisterRequiredIndicators = {
  /** Title, description, category, risk manager (Open / Monitoring / Mitigating). */
  assessmentBasics: boolean;
  preProbability: boolean;
  preCost: boolean;
  preTime: boolean;
  mitigationDescription: boolean;
  mitigationCost: boolean;
  postProbability: boolean;
  postCost: boolean;
  postTime: boolean;
};

function lifecycleBucket(status: string): "open" | "monitoring" | "mitigating" | null {
  const s = normalizeRiskStatusKey(status);
  if (s === "open") return "open";
  if (s === "monitoring") return "monitoring";
  if (s === "mitigating" || s === "mitigated") return "mitigating";
  return null;
}

const NO_REQUIRED_INDICATORS: RiskRegisterRequiredIndicators = {
  assessmentBasics: false,
  preProbability: false,
  preCost: false,
  preTime: false,
  mitigationDescription: false,
  mitigationCost: false,
  postProbability: false,
  postCost: false,
  postTime: false,
};

/**
 * Required-asterisk flags aligned with {@link getRiskRegisterSaveValidationErrors}.
 * Draft / Closed / Archived: no assessment asterisks.
 * Open: pre/assessment only (mitigation text does not force post).
 * Monitoring: assessment + mitigation description (+ cost when text); post optional.
 * Mitigating: assessment + mitigation + applicable post fields.
 */
export function getRiskRegisterRequiredIndicators(input: {
  status: string;
  appliesTo: string;
  mitigation: string;
}): RiskRegisterRequiredIndicators {
  if (
    isRiskStatusDraft(input.status) ||
    isRiskStatusClosed(input.status) ||
    isRiskStatusArchived(input.status)
  ) {
    return { ...NO_REQUIRED_INDICATORS };
  }

  const bucket = lifecycleBucket(input.status);
  const mitigationTrim = input.mitigation.trim();
  const flags: RiskRegisterRequiredIndicators = {
    assessmentBasics: true,
    preProbability: true,
    preCost: appliesToAffectsCost(input.appliesTo),
    preTime: appliesToAffectsTime(input.appliesTo),
    mitigationDescription: false,
    mitigationCost: false,
    postProbability: false,
    postCost: false,
    postTime: false,
  };

  if (bucket === "monitoring") {
    flags.mitigationDescription = true;
    flags.mitigationCost = mitigationTrim.length > 0;
    return flags;
  }
  if (bucket === "mitigating") {
    flags.mitigationDescription = true;
    flags.mitigationCost = true;
    flags.postProbability = true;
    flags.postCost = appliesToAffectsCost(input.appliesTo);
    flags.postTime = appliesToAffectsTime(input.appliesTo);
    return flags;
  }
  // Open (and any other non-excluded status): assessment/pre only.
  return flags;
}

/** True when any mitigation narrative or planned post value is present (form or stored). */
export function riskRegisterHasMitigationOrPostData(fields: {
  mitigation?: string | null;
  mitigationCost?: string | number | null;
  postMitigationProbabilityPct?: string | number | null;
  postMitigationCostMin?: string | number | null;
  postMitigationCostML?: string | number | null;
  postMitigationCostMax?: string | number | null;
  postMitigationTimeMin?: string | number | null;
  postMitigationTimeML?: string | number | null;
  postMitigationTimeMax?: string | number | null;
}): boolean {
  const str = (v: string | number | null | undefined) =>
    v == null ? "" : typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v).trim();
  if (str(fields.mitigation)) return true;
  if (str(fields.mitigationCost)) return true;
  if (str(fields.postMitigationProbabilityPct)) return true;
  if (str(fields.postMitigationCostMin)) return true;
  if (str(fields.postMitigationCostML)) return true;
  if (str(fields.postMitigationCostMax)) return true;
  if (str(fields.postMitigationTimeMin)) return true;
  if (str(fields.postMitigationTimeML)) return true;
  if (str(fields.postMitigationTimeMax)) return true;
  return false;
}

/**
 * Mitigation + post section visibility. Lifecycle status is authority for Monitoring/Mitigating;
 * modelling mode only expands Draft/Open (and other non-forced statuses) optionally.
 * Does not affect save requiredness or simulation input selection.
 */
export function shouldShowRiskRegisterMitigationFields(input: {
  status: string;
  /** Modelling segmented control expanded (Post-mitigation input profile). */
  mitigationExpanded: boolean;
  hasMitigationOrPostData: boolean;
}): boolean {
  const bucket = lifecycleBucket(input.status);
  if (bucket === "monitoring" || bucket === "mitigating") return true;
  return input.mitigationExpanded || input.hasMitigationOrPostData;
}

/**
 * Field labels for save blockers (shown in modal Callouts).
 * Draft / Closed / Archived skip assessment requirements (closure note handled by callers).
 */
export function getRiskRegisterSaveValidationErrors(form: RiskRegisterSaveFormFields): string[] {
  const errors: string[] = [];
  if (!form.status.trim()) errors.push("Status");

  if (isRiskStatusDraft(form.status)) {
    return errors;
  }

  if (!form.appliesTo.trim()) errors.push("Applies to");

  if (isRiskStatusClosed(form.status) || isRiskStatusArchived(form.status)) {
    return errors;
  }

  if (!form.title.trim()) errors.push("Title");
  if (!form.description.trim()) errors.push("Risk Description");
  if (!form.category.trim()) errors.push("Category");
  if (!form.ownerResolved.trim()) errors.push("Risk Manager");

  const prePct = parseFloat(form.preMitigationProbabilityPct);
  if (!Number.isFinite(prePct) || prePct < 0 || prePct > 100) {
    errors.push("Pre-Mitigation Probability %");
  }

  if (appliesToAffectsCost(form.appliesTo)) {
    const preCostMin = parseFloat(form.preMitigationCostMin);
    if (form.preMitigationCostMin.trim() === "" || !Number.isFinite(preCostMin) || preCostMin < 0) {
      errors.push("Pre-Mitigation Cost Min");
    }
    const v = parseFloat(form.preMitigationCostML);
    if (!Number.isFinite(v) || v < 0) errors.push("Pre-Mitigation Cost Most Likely");
    const preCostMax = parseFloat(form.preMitigationCostMax);
    if (form.preMitigationCostMax.trim() === "" || !Number.isFinite(preCostMax) || preCostMax < 0) {
      errors.push("Pre-Mitigation Cost Max");
    }
  }

  if (appliesToAffectsTime(form.appliesTo)) {
    const preTimeMin = parseInt(form.preMitigationTimeMin, 10);
    if (form.preMitigationTimeMin.trim() === "" || !Number.isFinite(preTimeMin) || preTimeMin < 0) {
      errors.push("Pre-Mitigation Time Min (working days)");
    }
    const v = parseInt(form.preMitigationTimeML, 10);
    if (!Number.isFinite(v) || v < 0) errors.push("Pre-Mitigation Time ML (working days)");
    const preTimeMax = parseInt(form.preMitigationTimeMax, 10);
    if (form.preMitigationTimeMax.trim() === "" || !Number.isFinite(preTimeMax) || preTimeMax < 0) {
      errors.push("Pre-Mitigation Time Max (working days)");
    }
  }

  const bucket = lifecycleBucket(form.status);
  const mitigationTrim = form.mitigation.trim();

  // Open: pre only — mitigation text / legacy mode must not require post fields.
  if (bucket === "monitoring" || bucket === "mitigating") {
    if (!mitigationTrim) errors.push("Mitigation description");
    // Mitigation cost required whenever a description exists (Monitoring/Mitigating always need description).
    if (mitigationTrim) {
      const costRaw = form.mitigationCost.trim().replace(/,/g, "");
      const cost = parseFloat(costRaw);
      if (costRaw === "" || !Number.isFinite(cost) || cost < 0) {
        errors.push("Mitigation Cost");
      }
    }
  }

  if (bucket === "mitigating") {
    const postPct = parseFloat(form.postMitigationProbabilityPct);
    if (!Number.isFinite(postPct) || postPct < 0 || postPct > 100) {
      errors.push("Post-Mitigation Probability");
    }
    if (appliesToAffectsCost(form.appliesTo)) {
      const postCostMin = parseFloat(form.postMitigationCostMin);
      if (form.postMitigationCostMin.trim() === "" || !Number.isFinite(postCostMin) || postCostMin < 0) {
        errors.push("Post-Mitigation Cost Min");
      }
      const v = parseFloat(form.postMitigationCostML);
      if (!Number.isFinite(v) || v < 0) errors.push("Post-Mitigation Cost Most Likely");
      const postCostMax = parseFloat(form.postMitigationCostMax);
      if (form.postMitigationCostMax.trim() === "" || !Number.isFinite(postCostMax) || postCostMax < 0) {
        errors.push("Post-Mitigation Cost Max");
      }
    }
    if (appliesToAffectsTime(form.appliesTo)) {
      const postTimeMin = parseInt(form.postMitigationTimeMin, 10);
      if (form.postMitigationTimeMin.trim() === "" || !Number.isFinite(postTimeMin) || postTimeMin < 0) {
        errors.push("Post-Mitigation Time Min (working days)");
      }
      const v = parseInt(form.postMitigationTimeML, 10);
      if (!Number.isFinite(v) || v < 0) errors.push("Post-Mitigation Time ML (working days)");
      const postTimeMax = parseInt(form.postMitigationTimeMax, 10);
      if (form.postMitigationTimeMax.trim() === "" || !Number.isFinite(postTimeMax) || postTimeMax < 0) {
        errors.push("Post-Mitigation Time Max (working days)");
      }
    }
  }

  return errors;
}
