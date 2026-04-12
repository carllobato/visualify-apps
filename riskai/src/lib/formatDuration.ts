/**
 * Canonical duration formatting for schedule/Programme display.
 * Input is always in days. Used consistently for P20/P50/P80/P90 tiles and time charts.
 *
 * Rules:
 * - Under 14 days: show "X day(s)" (no rounding that turns 10 into 1 week).
 * - 14 days and above: show weeks with configurable decimals (default one), e.g. "2.0 weeks".
 */

const DAYS_THRESHOLD_WEEKS = 14;

export type FormatDurationDaysOptions = {
  /** Decimal places when showing 14+ days as weeks. Default `1`. Use `2` in ranked lists where 1 dp collapses distinct values. */
  weekDecimals?: number;
};

/**
 * Format a duration in days for display.
 * - undefined/NaN/negative → "—"
 * - 0 → "0 days"
 * - 1 → "1 day"
 * - 2..13 → "X days"
 * - 14+ → "(days/7).toFixed(weekDecimals) weeks" (default weekDecimals 1; e.g. 14 → "2.0 weeks")
 */
export function formatDurationDays(days: number | undefined, options?: FormatDurationDaysOptions): string {
  if (days == null || !Number.isFinite(days) || days < 0) return "—";
  if (days < DAYS_THRESHOLD_WEEKS) {
    const n = Math.round(days);
    return n === 1 ? "1 day" : `${n.toLocaleString()} days`;
  }
  const decimals = options?.weekDecimals ?? 1;
  const d = Number.isFinite(decimals) ? Math.max(0, Math.min(4, Math.round(decimals))) : 1;
  const weeks = days / 7;
  return `${weeks.toFixed(d)} weeks`;
}

/**
 * {@link formatDurationDays} rules, but the total is rounded to the **nearest whole day** first;
 * 14+ days are shown as **whole weeks** as `wk` / `wks` (portfolio donut center + tooltips).
 */
export function formatDurationDaysRoundedWhole(days: number | undefined): string {
  if (days == null || !Number.isFinite(days) || days < 0) return "—";
  const n = Math.round(days);
  if (n === 0) return "0 days";
  if (n < DAYS_THRESHOLD_WEEKS) {
    return n === 1 ? "1 day" : `${n.toLocaleString()} days`;
  }
  const weeks = Math.round(n / 7);
  return weeks === 1 ? "1 wk" : `${weeks.toLocaleString()} wks`;
}

/**
 * Whole days only (rounded), same phrasing as sub-14-day branch of {@link formatDurationDays}.
 * Use for schedule contingency totals so they stay in the same units as deltas like "10 days buffer".
 */
export function formatDurationWholeDays(days: number): string {
  if (!Number.isFinite(days) || days < 0) return "—";
  const n = Math.round(days);
  if (n === 0) return "0 days";
  return n === 1 ? "1 day" : `${n.toLocaleString()} days`;
}

/**
 * Short labels for narrow UI (e.g. Gantt overlays). Same thresholds as {@link formatDurationDays}.
 */
export function formatDurationDaysBarLabel(days: number): string {
  if (!Number.isFinite(days) || days < 0) return "—";
  if (days < DAYS_THRESHOLD_WEEKS) {
    const n = Math.round(days);
    return n === 1 ? "1 d" : `${n.toLocaleString()} d`;
  }
  const weeks = days / 7;
  return `${weeks.toFixed(1)} wk`;
}
