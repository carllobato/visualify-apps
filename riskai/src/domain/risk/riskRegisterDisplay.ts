/**
 * Register/table label for a project's stable risk number from the DB.
 * Risks not yet assigned a number (e.g. before first save) show "New".
 */
export function formatRiskRegisterNumberDisplay(riskNumber: number | null | undefined): string {
  if (riskNumber != null) return String(riskNumber).padStart(3, "0");
  return "New";
}

/**
 * Header/detail label: padded risk number when assigned; otherwise the stable row `id`
 * (persisted UUID or client id) so each risk stays identifiable when unnumbered.
 */
export function formatRiskRegisterNumberOrId(
  riskNumber: number | null | undefined,
  riskId: string,
): string {
  if (riskNumber != null) return String(riskNumber).padStart(3, "0");
  return riskId;
}
