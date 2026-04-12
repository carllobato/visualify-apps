/**
 * Horizontal bar fills (portfolio dashboard charts): when value &gt; 0, the fill must stay
 * wide enough for pill end caps plus a short tabular count. Pure % width can collapse to
 * a sub-pixel sliver that only shows one rounded edge.
 */
export const CHART_HORIZONTAL_BAR_MIN_FILL = "3rem" as const;

/**
 * Left label column for portfolio horizontal bar charts (category, severity, status).
 * Single width (`w-20`) so rows align across cards; longer names rely on `truncate` + `title`.
 */
export const CHART_HORIZONTAL_BAR_ROW_LABEL_CLASS =
  "w-20 shrink-0 truncate text-right text-[length:var(--ds-chart-label-size)] text-[var(--ds-chart-axis)] opacity-[0.88]";

/**
 * Pass to `style={{ width: chartHorizontalBarFillWidthCss(pct) }}` for a non-zero value.
 * When `widthPct` is 0 or negative, returns `"0"` so we do not apply a minimum width to an empty bar.
 */
export function chartHorizontalBarFillWidthCss(widthPct: number): string {
  if (!Number.isFinite(widthPct) || widthPct <= 0) return "0";
  return `min(100%, max(${widthPct}%, ${CHART_HORIZONTAL_BAR_MIN_FILL}))`;
}

/** Inline styles for `position: absolute` gantt segments (simulation page, etc.). */
export type GanttSegmentStyle = {
  left?: string;
  right?: string;
  width: string;
};

/**
 * Segment starts at `leftPct` (0–100). Width is at least {@link CHART_HORIZONTAL_BAR_MIN_FILL}, capped so the bar
 * does not overflow past the track (`100% − left`).
 */
export function ganttSegmentLeftAnchoredStyle(leftPct: number, widthPct: number): GanttSegmentStyle {
  if (!Number.isFinite(leftPct) || !Number.isFinite(widthPct) || widthPct <= 0) {
    return { left: `${Math.min(100, Math.max(0, leftPct))}%`, width: "0" };
  }
  const L = Math.min(100, Math.max(0, leftPct));
  return {
    left: `${L}%`,
    width: `min(max(${widthPct}%, ${CHART_HORIZONTAL_BAR_MIN_FILL}), calc(100% - ${L}%))`,
  };
}

/**
 * Segment’s **right edge** sits at `endPct` (0–100 from the track’s left). Growing the bar leftward keeps that edge
 * fixed so a minimum width does not collapse to a one-sided pill when `widthPct` is tiny.
 */
export function ganttSegmentRightAnchoredStyle(endPct: number, widthPct: number): GanttSegmentStyle {
  if (!Number.isFinite(endPct) || !Number.isFinite(widthPct) || widthPct <= 0) {
    return { left: "auto", right: "100%", width: "0" };
  }
  const E = Math.min(100, Math.max(0, endPct));
  return {
    left: "auto",
    right: `calc(100% - ${E}%)`,
    width: `min(max(${widthPct}%, ${CHART_HORIZONTAL_BAR_MIN_FILL}), ${E}%)`,
  };
}
