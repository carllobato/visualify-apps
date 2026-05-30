/**
 * ControlAI risk module tabs — aligned to RiskAI project routes (register, simulation, run-data)
 * without duplicating project-level side nav.
 *
 * RiskAI reference:
 * - `/projects/[id]/risks` → Risk register
 * - `/projects/[id]/simulation` → Simulation / analysis
 * - `/projects/[id]/run-data` → Run data / inputs
 * - Treatment & reviews → future ControlAI surfaces (no dedicated RiskAI nav route yet)
 */
export const RISK_MODULE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "register", label: "Register" },
  { id: "analysis", label: "Analysis" },
  { id: "treatment", label: "Treatment" },
  { id: "reviews", label: "Reviews" },
] as const;

export type RiskModuleTabId = (typeof RISK_MODULE_TABS)[number]["id"];
