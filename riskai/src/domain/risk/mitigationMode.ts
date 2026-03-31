import type { MitigationMode, Risk } from "./risk.schema";

/**
 * Merge forward-exposure `mitigationProfile` from the modelling mitigation mode.
 * Forecast maps to `mitigationProfile.status` = planned (schema has no `forecast`).
 */
export function mergeMitigationProfileForMode(
  currentRisk: Risk,
  mode: MitigationMode
): NonNullable<Risk["mitigationProfile"]> {
  const prev = currentRisk.mitigationProfile;
  const base = {
    effectiveness: prev?.effectiveness ?? 0,
    confidence: prev?.confidence ?? 0,
    reduces: prev?.reduces ?? 0,
    lagMonths: prev?.lagMonths ?? 0,
  };
  if (mode === "none") {
    return { status: "none", ...base, effectiveness: 0, confidence: 0, reduces: 0, lagMonths: 0 };
  }
  if (mode === "forecast") {
    return { status: "planned", ...base };
  }
  return { status: "active", ...base };
}

/**
 * Resolve modelling mitigation mode from `mitigationProfile` and legacy mitigation text (not persisted in Supabase).
 */
export function mitigationModeFromRisk(risk: Risk): MitigationMode {
  const s = risk.mitigationProfile?.status;
  if (s === "none") return "none";
  if (s === "active") return "active";
  if (s === "planned" || s === "completed") return "forecast";
  if (risk.mitigation?.trim()) return "active";
  return "none";
}
