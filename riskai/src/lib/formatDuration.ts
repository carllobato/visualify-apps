/**
 * Canonical duration formatting for RiskAI schedule display.
 * Input is always interpreted as working days for simulation/reporting outputs.
 */

export type FormatDurationDaysOptions = {
  /** @deprecated No longer used; schedule reporting is displayed in working days only. */
  weekDecimals?: number;
};

/**
 * Format a duration in working days for display.
 * - undefined/NaN/negative → "—"
 * - 0 → "0 working days"
 * - 1 → "1 working day"
 * - 2+ → "X working days"
 */
export function formatDurationDays(days: number | undefined, options?: FormatDurationDaysOptions): string {
  void options;
  if (days == null || !Number.isFinite(days) || days < 0) return "—";
  const n = Math.round(days);
  return n === 1 ? "1 working day" : `${n.toLocaleString()} working days`;
}

/**
 * {@link formatDurationDays} rules, but the total is rounded to the nearest whole working day first.
 */
export function formatDurationDaysRoundedWhole(days: number | undefined): string {
  if (days == null || !Number.isFinite(days) || days < 0) return "—";
  const n = Math.round(days);
  return n === 1 ? "1 working day" : `${n.toLocaleString()} working days`;
}

/**
 * Whole working days only (rounded).
 * Use for schedule contingency totals so they stay in the same units as deltas like "10 working days buffer".
 */
export function formatDurationWholeDays(days: number): string {
  if (!Number.isFinite(days) || days < 0) return "—";
  const n = Math.round(days);
  return n === 1 ? "1 working day" : `${n.toLocaleString()} working days`;
}

/**
 * Short working-day labels for narrow UI (e.g. Gantt overlays).
 */
export function formatDurationDaysBarLabel(days: number): string {
  if (!Number.isFinite(days) || days < 0) return "—";
  const n = Math.round(days);
  return n === 1 ? "1 wd" : `${n.toLocaleString()} wd`;
}
