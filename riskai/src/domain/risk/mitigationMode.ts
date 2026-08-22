import type { MitigationMode, Risk } from "./risk.schema";
import { normalizeRiskStatusKey } from "./riskFieldSemantics";

/** UI input-profile view (2-way). Legacy MitigationMode remains for persistence compatibility. */
export type ModellingInputProfile = "pre" | "post";

/**
 * Legacy modelling mode → Pre/Post input profile.
 * `none` → Pre; `forecast` | `active` → Post.
 */
export function modellingInputProfileFromMode(mode: MitigationMode): ModellingInputProfile {
  return mode === "none" ? "pre" : "post";
}

/**
 * Pre/Post UI selection → legacy MitigationMode for mergeMitigationProfileForMode.
 * Selecting Post preserves forecast vs active when already Post; otherwise Mitigating → active, else forecast.
 * Never mutates lifecycle status.
 */
export function mitigationModeFromInputProfile(
  profile: ModellingInputProfile,
  opts?: { status?: string; previousMode?: MitigationMode }
): MitigationMode {
  if (profile === "pre") return "none";
  const prev = opts?.previousMode;
  if (prev === "forecast" || prev === "active") return prev;
  const k = normalizeRiskStatusKey(opts?.status);
  if (k === "mitigating" || k === "mitigated") return "active";
  return "forecast";
}

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
 * Resolve modelling mitigation mode from `mitigationProfile`, lifecycle `status`, and legacy mitigation text.
 * Priority: explicit mitigationProfile → lifecycle status → mitigation text presence → none.
 * Callers map to Pre/Post via {@link modellingInputProfileFromMode}.
 */
export function mitigationModeFromRisk(risk: Risk): MitigationMode {
  const s = risk.mitigationProfile?.status;
  if (s === "none") return "none";
  if (s === "active") return "active";
  if (s === "planned" || s === "completed") return "forecast";
  const lifecycle = normalizeRiskStatusKey(risk.status);
  if (lifecycle === "mitigating" || lifecycle === "mitigated") return "active";
  if (lifecycle === "monitoring") return "forecast";
  if (risk.mitigation?.trim()) return "active";
  return "none";
}
