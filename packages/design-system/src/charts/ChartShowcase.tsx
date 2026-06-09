"use client";

import { useId, useState, type MouseEvent, type ReactNode } from "react";

type ChartStatus = "positive" | "negative" | "neutral";
type ChartState = "default" | "highlight" | "muted";
type ChartVariant = "default" | "comparison" | "distribution";
type ChartColorMode = "monochrome" | "categorical" | "status";

type BaseChartProps<TData> = {
  title: string;
  data: TData;
  insight: string;
  status?: ChartStatus;
  showDelta?: boolean;
  delta?: string;
  highlightIndex?: number;
  highlightKey?: string;
  variant?: ChartVariant;
  colorMode?: ChartColorMode;
  hoverCard?: {
    label: string;
    value: string;
    delta?: string;
    status?: ChartStatus;
  };
};

type PieDatum = { key: string; value: number };
type ColumnDatum = { key: string; value: number };
type PointDatum = { key: string; value: number };
type ScatterDatum = { key: string; x: number; y: number };
type SparkDatum = number[];

/** Shared demo datasets for ChartShowcase and dashboard block examples. */
export const chartShowcasePieData: PieDatum[] = [
  { key: "A", value: 35 },
  { key: "B", value: 25 },
  { key: "C", value: 20 },
  { key: "D", value: 12 },
  { key: "E", value: 8 },
];

export const chartShowcaseColumnData: ColumnDatum[] = [
  { key: "Jan", value: 42 },
  { key: "Feb", value: 68 },
  { key: "Mar", value: 55 },
  { key: "Apr", value: 82 },
  { key: "May", value: 48 },
  { key: "Jun", value: 72 },
];

export const chartShowcaseBarData: ColumnDatum[] = [
  { key: "North", value: 88 },
  { key: "South", value: 72 },
  { key: "East", value: 64 },
  { key: "West", value: 52 },
  { key: "Central", value: 38 },
];

export const chartShowcaseLineData: PointDatum[] = [
  { key: "P1", value: 8 },
  { key: "P2", value: 22 },
  { key: "P3", value: 18 },
  { key: "P4", value: 32 },
  { key: "P5", value: 28 },
  { key: "P6", value: 38 },
  { key: "P7", value: 34 },
  { key: "P8", value: 42 },
];

const SERIES_VARS = [
  "var(--ds-chart-series-1)",
  "var(--ds-chart-series-2)",
  "var(--ds-chart-series-3)",
  "var(--ds-chart-series-4)",
  "var(--ds-chart-series-5)",
  "var(--ds-chart-series-6)",
] as const;

const STATUS_COLOR_VAR: Record<ChartStatus, string> = {
  positive: "var(--ds-chart-insight-positive)",
  negative: "var(--ds-chart-insight-negative)",
  neutral: "var(--ds-chart-annotation)",
};

const STATE_OPACITY_VAR: Record<ChartState, string> = {
  default: "var(--ds-chart-opacity-default)",
  highlight: "var(--ds-chart-opacity-highlight)",
  muted: "var(--ds-chart-opacity-muted)",
};

const STROKE_WIDTH_VAR: Record<ChartState, string> = {
  default: "var(--ds-chart-stroke-width-default)",
  highlight: "var(--ds-chart-stroke-width-highlight)",
  muted: "var(--ds-chart-stroke-width-default)",
};

function seriesColor(index: number) {
  return SERIES_VARS[index % SERIES_VARS.length];
}

function statusColor(status: ChartStatus) {
  if (status === "positive") return "var(--ds-chart-insight-positive)";
  if (status === "negative") return "var(--ds-chart-insight-negative)";
  return "var(--ds-chart-annotation)";
}

function dataColor({
  index,
  state,
  colorMode,
  status,
}: {
  index: number;
  state: ChartState;
  colorMode: ChartColorMode;
  status: ChartStatus;
}) {
  if (colorMode === "categorical") return seriesColor(index);
  if (colorMode === "status") return statusColor(status);
  if (state === "highlight") return "var(--ds-chart-emphasis)";
  if (state === "muted") return "var(--ds-chart-muted-series)";
  return "color-mix(in oklab, var(--ds-chart-emphasis) 72%, var(--ds-chart-muted-series))";
}

function dataStateForIndex(index: number, highlightIndex: number | undefined, variant: ChartVariant): ChartState {
  if (highlightIndex === undefined) return "default";
  if (index === highlightIndex) return "highlight";
  return variant === "default" ? "default" : "muted";
}

function dataStateForKey(key: string, highlightKey: string | undefined, variant: ChartVariant): ChartState {
  if (!highlightKey) return "default";
  if (key === highlightKey) return "highlight";
  return variant === "default" ? "default" : "muted";
}

function pieSlicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function donutArcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  start: number,
  end: number,
) {
  const x1o = cx + rOuter * Math.cos(start);
  const y1o = cy + rOuter * Math.sin(start);
  const x2o = cx + rOuter * Math.cos(end);
  const y2o = cy + rOuter * Math.sin(end);
  const x1i = cx + rInner * Math.cos(end);
  const y1i = cy + rInner * Math.sin(end);
  const x2i = cx + rInner * Math.cos(start);
  const y2i = cy + rInner * Math.sin(start);
  const large = end - start > Math.PI ? 1 : 0;

  return [
    `M ${x1o} ${y1o}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x2i} ${y2i}`,
    "Z",
  ].join(" ");
}

function normalizedIndex(index: number, length: number) {
  if (length <= 1) return 0;
  return index / (length - 1);
}

const MULTI_LINE_VIEW_WIDTH = 100;
const MULTI_LINE_VIEW_HEIGHT = 88;
const MULTI_LINE_VIEW_PAD = 4;
const MULTI_LINE_MIN_POINT_WIDTH_PX = 40;

function multiLinePlotX(index: number, count: number) {
  if (count <= 1) return MULTI_LINE_VIEW_PAD;
  return MULTI_LINE_VIEW_PAD + normalizedIndex(index, count) * (MULTI_LINE_VIEW_WIDTH - MULTI_LINE_VIEW_PAD * 2);
}

function multiLinePlotXPercent(index: number, count: number) {
  return (multiLinePlotX(index, count) / MULTI_LINE_VIEW_WIDTH) * 100;
}

function ChartFrame({
  title,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  embedded = false,
  children,
}: {
  title?: string;
  insight?: string;
  status?: ChartStatus;
  showDelta?: boolean;
  delta?: string;
  hoverCard?: BaseChartProps<unknown>["hoverCard"];
  embedded?: boolean;
  children: ReactNode;
}) {
  const hoverStatus = hoverCard?.status ?? "neutral";
  return (
    <div
      className={
        embedded
          ? "flex h-full w-full min-w-0 flex-col"
          : "rounded-[var(--ds-radius-md)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-panel)]/95 p-[var(--ds-chart-panel-padding)]"
      }
    >
      {title ? (
        <div
          className={
            embedded
              ? "mb-[var(--ds-chart-header-gap)] flex items-start justify-between gap-3 px-4 pt-3"
              : "mb-[var(--ds-chart-header-gap)] flex items-start justify-between gap-3"
          }
        >
          <div className="flex items-baseline gap-2">
            <h3 className="text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-card-foreground)]">{title}</h3>
            {showDelta && delta ? (
              <span
                className="text-[length:var(--ds-chart-label-size)] font-medium tabular-nums"
                style={{ color: STATUS_COLOR_VAR[status] }}
              >
                {delta}
              </span>
            ) : null}
          </div>
          {insight ? (
            <span
              className="text-[length:var(--ds-chart-annotation-size)] font-semibold uppercase tracking-[0.045em]"
              style={{ color: STATUS_COLOR_VAR[status], opacity: 0.94 }}
            >
              {insight}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={embedded ? "relative min-h-0 flex-1" : "relative"}>
        {children}
        {hoverCard ? (
          <div className="pointer-events-none absolute right-2 top-2 min-w-[120px] rounded-[var(--ds-radius-sm)] border border-[var(--ds-chart-panel-border)] bg-[color-mix(in_oklab,var(--ds-chart-panel)_88%,var(--ds-background))] px-2.5 py-2 shadow-[var(--ds-shadow-sm)]">
            <p className="text-[length:var(--ds-chart-annotation-size)] uppercase tracking-[0.05em] text-[var(--ds-chart-axis)]">
              {hoverCard.label}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--ds-card-foreground)]">{hoverCard.value}</p>
            {hoverCard.delta ? (
              <p className="mt-0.5 text-[length:var(--ds-chart-label-size)] font-medium" style={{ color: STATUS_COLOR_VAR[hoverStatus] }}>
                {hoverCard.delta}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PieChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "distribution",
  colorMode = "monochrome",
}: BaseChartProps<PieDatum[]>) {
  const cx = 50;
  const cy = 50;
  const r = 38;
  const offset = -Math.PI / 2;
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;

  let angle = offset;
  const slices = data.map((datum, i) => {
    const sweep = (datum.value / total) * 2 * Math.PI;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      d: pieSlicePath(cx, cy, r, start, end),
      state: dataStateForIndex(i, highlightIndex, variant),
    };
  });

  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-[176px]" aria-hidden>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={slice.d}
            fill={dataColor({ index: i, state: slice.state, colorMode, status })}
            fillOpacity={STATE_OPACITY_VAR[slice.state]}
            stroke="var(--ds-chart-panel)"
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </ChartFrame>
  );
}

export function DonutChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "distribution",
  colorMode = "monochrome",
}: BaseChartProps<PieDatum[]>) {
  const cx = 50;
  const cy = 50;
  const rOuter = 40;
  const rInner = 25;
  const offset = -Math.PI / 2;
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;

  let angle = offset;
  const arcs = data.map((datum, i) => {
    const sweep = (datum.value / total) * 2 * Math.PI;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      d: donutArcPath(cx, cy, rOuter, rInner, start, end),
      state: dataStateForIndex(i, highlightIndex, variant),
      value: datum.value,
    };
  });

  const highlighted = highlightIndex !== undefined ? data[highlightIndex] : undefined;

  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-[176px]" aria-hidden>
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arc.d}
            fill={dataColor({ index: i, state: arc.state, colorMode, status })}
            fillOpacity={STATE_OPACITY_VAR[arc.state]}
            stroke="var(--ds-chart-panel)"
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {highlighted ? (
          <>
            <text x={50} y={49} textAnchor="middle" className="fill-[var(--ds-card-foreground)]" style={{ fontSize: "13px", fontWeight: 600 }}>
              {highlighted.value}%
            </text>
            <text x={50} y={60} textAnchor="middle" className="fill-[var(--ds-chart-axis)]" style={{ fontSize: "8px" }}>
              {highlighted.key}
            </text>
          </>
        ) : null}
      </svg>
    </ChartFrame>
  );
}

const DONUT_REMAINING_FILL =
  "color-mix(in oklab, var(--ds-border) 30%, var(--ds-surface-muted))";

export type DonutChartGlyphProps = {
  /** Share complete on a 0–1 scale. */
  completedRatio: number;
  centerLabel: string;
  centerSubLabel?: string;
  status?: ChartStatus;
  colorMode?: ChartColorMode;
  className?: string;
  ariaLabel?: string;
};

export function DonutChartGlyph({
  completedRatio,
  centerLabel,
  centerSubLabel,
  status = "neutral",
  colorMode = "monochrome",
  className = "",
  ariaLabel,
}: DonutChartGlyphProps) {
  const cx = 50;
  const cy = 50;
  const rOuter = 40;
  const rInner = 25;
  const offset = -Math.PI / 2;
  const ratio = Math.min(1, Math.max(0, completedRatio));
  const completedEnd = offset + ratio * 2 * Math.PI;
  const fullCircleEnd = offset + 2 * Math.PI;

  const segments: { start: number; end: number; index: number; state: ChartState }[] = [];
  if (ratio > 0) {
    segments.push({ start: offset, end: completedEnd, index: 0, state: "highlight" });
  }
  if (ratio < 1) {
    segments.push({
      start: ratio > 0 ? completedEnd : offset,
      end: fullCircleEnd,
      index: 1,
      state: "default",
    });
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={`mx-auto aspect-square w-full max-w-[200px] ${className}`.trim()}
      role="img"
      aria-label={ariaLabel ?? `${centerLabel} complete`}
    >
      {segments.map((segment) => {
        const isRemaining = segment.index === 1;
        return (
          <path
            key={`${segment.index}-${segment.start}`}
            d={donutArcPath(cx, cy, rOuter, rInner, segment.start, segment.end)}
            fill={
              isRemaining
                ? DONUT_REMAINING_FILL
                : dataColor({ index: segment.index, state: segment.state, colorMode, status })
            }
            fillOpacity={isRemaining ? "1" : STATE_OPACITY_VAR[segment.state]}
            stroke={isRemaining ? "var(--ds-border-subtle)" : "var(--ds-chart-panel)"}
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <text
        x={cx}
        y={49}
        textAnchor="middle"
        className="fill-[var(--ds-card-foreground)]"
        style={{ fontSize: "13px", fontWeight: 600 }}
      >
        {centerLabel}
      </text>
      {centerSubLabel ? (
        <text
          x={cx}
          y={60}
          textAnchor="middle"
          className="fill-[var(--ds-chart-axis)]"
          style={{ fontSize: "8px" }}
        >
          {centerSubLabel}
        </text>
      ) : null}
    </svg>
  );
}

export type HalfDonutChartGlyphProps = DonutChartGlyphProps;

export function HalfDonutChartGlyph({
  completedRatio,
  centerLabel,
  centerSubLabel,
  status = "neutral",
  colorMode = "monochrome",
  className = "",
  ariaLabel,
}: HalfDonutChartGlyphProps) {
  const cx = 50;
  const cy = 58;
  const rOuter = 40;
  const rInner = 25;
  const start = Math.PI;
  const end = 2 * Math.PI;
  const ratio = Math.min(1, Math.max(0, completedRatio));
  const completedEnd = start + ratio * Math.PI;

  const segments: { start: number; end: number; index: number; state: ChartState }[] = [];
  if (ratio > 0) {
    segments.push({ start, end: completedEnd, index: 0, state: "highlight" });
  }
  if (ratio < 1) {
    segments.push({ start: ratio > 0 ? completedEnd : start, end, index: 1, state: "default" });
  }

  return (
    <svg
      viewBox="0 0 100 80"
      className={`mx-auto aspect-[100/80] w-full min-h-[128px] max-w-[200px] ${className}`.trim()}
      role="img"
      aria-label={ariaLabel ?? `${centerLabel} complete`}
    >
      {segments.map((segment) => {
        const isRemaining = segment.index === 1;
        return (
          <path
            key={`${segment.index}-${segment.start}`}
            d={donutArcPath(cx, cy, rOuter, rInner, segment.start, segment.end)}
            fill={
              isRemaining
                ? DONUT_REMAINING_FILL
                : dataColor({ index: segment.index, state: segment.state, colorMode, status })
            }
            fillOpacity={isRemaining ? "1" : STATE_OPACITY_VAR[segment.state]}
            stroke={isRemaining ? "var(--ds-border-subtle)" : "var(--ds-chart-panel)"}
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <text
        x={cx}
        y={44}
        textAnchor="middle"
        className="fill-[var(--ds-card-foreground)]"
        style={{ fontSize: "13px", fontWeight: 600 }}
      >
        {centerLabel}
      </text>
      {centerSubLabel ? (
        <text
          x={cx}
          y={54}
          textAnchor="middle"
          className="fill-[var(--ds-chart-axis)]"
          style={{ fontSize: "8px" }}
        >
          {centerSubLabel}
        </text>
      ) : null}
    </svg>
  );
}

export function HalfDonutChartPrimitive({
  title,
  insight,
  completedRatio,
  centerLabel,
  centerSubLabel,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  colorMode = "monochrome",
}: {
  title: string;
  insight: string;
  completedRatio: number;
  centerLabel: string;
  centerSubLabel?: string;
  status?: ChartStatus;
  showDelta?: boolean;
  delta?: string;
  hoverCard?: BaseChartProps<unknown>["hoverCard"];
  colorMode?: ChartColorMode;
}) {
  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <HalfDonutChartGlyph
        completedRatio={completedRatio}
        centerLabel={centerLabel}
        centerSubLabel={centerSubLabel}
        status={status}
        colorMode={colorMode}
      />
    </ChartFrame>
  );
}

export function ColumnChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<ColumnDatum[]>) {
  const domainMax = 100;

  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <div className="rounded-[var(--ds-radius-sm)] bg-[var(--ds-chart-surface)] px-[var(--ds-space-2)] pb-[var(--ds-space-2)] pt-[var(--ds-space-1)]">
        <div className="relative h-32 border-b border-[var(--ds-chart-grid)] px-0.5 pb-2">
          {[0.25, 0.5, 0.75].map((t) => (
            <span
              key={t}
              className="pointer-events-none absolute inset-x-0 border-t border-[var(--ds-chart-grid)]"
              style={{ top: `${100 - t * 100}%`, opacity: "var(--ds-chart-grid-opacity)" }}
              aria-hidden
            />
          ))}
          <div className="relative grid h-full grid-cols-6 items-end gap-1.5">
            {data.map((point, i) => {
              const state = dataStateForIndex(i, highlightIndex, variant);
              return (
                <div key={point.key} className="relative flex h-full min-w-0 items-end justify-center">
                  <div
                    className="w-full min-w-[8px] max-w-[44px] rounded-t-[var(--ds-chart-bar-radius)]"
                    style={{
                      height: `${Math.max((point.value / domainMax) * 100, 3)}%`,
                      backgroundColor: dataColor({ index: i, state, colorMode, status }),
                      opacity: STATE_OPACITY_VAR[state],
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5 px-0.5">
          {data.map((point) => (
            <span key={point.key} className="truncate text-center text-[length:var(--ds-chart-label-size)] text-[var(--ds-chart-axis)] opacity-[0.88]">
              {point.key}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

export function BarChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<ColumnDatum[]>) {
  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <div className="flex flex-col justify-center gap-2.5 py-1">
        {data.map((point, i) => {
          const state = dataStateForIndex(i, highlightIndex, variant);
          return (
            <div key={point.key} className="flex items-center gap-3">
              <span className="w-16 shrink-0 truncate text-right text-[length:var(--ds-chart-label-size)] text-[var(--ds-chart-axis)] opacity-[0.88]">
                {point.key}
              </span>
              <div className="h-6 min-w-0 flex-1 overflow-hidden rounded-[var(--ds-chart-bar-radius)] bg-[var(--ds-chart-surface)]">
                <div
                  className="h-full rounded-[var(--ds-chart-bar-radius)]"
                  style={{
                    width: `${point.value}%`,
                    backgroundColor: dataColor({ index: i, state, colorMode, status }),
                    opacity: STATE_OPACITY_VAR[state],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}

type LineSeries = {
  label: string;
  data: PointDatum[];
  forecastFromIndex?: number;
  color?: string;
  fillUnder?: boolean;
};

function buildMultiLineAreaPath(
  data: PointDatum[],
  fromIndex: number,
  toIndex: number,
  count: number,
  plotY: (value: number) => number,
  viewHeight: number,
  viewPad: number,
) {
  const linePath = buildMultiLineSmoothPath(data, fromIndex, toIndex, count, plotY);
  if (!linePath) return "";

  const firstX = multiLinePlotX(fromIndex, count);
  const lastX = multiLinePlotX(toIndex, count);
  const baselineY = viewHeight - viewPad;

  return `${linePath} L ${lastX.toFixed(2)} ${baselineY.toFixed(2)} L ${firstX.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

function buildMultiLineSmoothPath(
  data: PointDatum[],
  fromIndex: number,
  toIndex: number,
  count: number,
  plotY: (value: number) => number,
) {
  return data
    .slice(fromIndex, toIndex + 1)
    .map((point, offset) => {
      const index = fromIndex + offset;
      const x = multiLinePlotX(index, count);
      const y = plotY(point.value);
      return `${offset === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildMultiLineSegments(
  data: PointDatum[],
  count: number,
  plotY: (value: number) => number,
  forecastFromIndex?: number,
) {
  const lastIndex = data.length - 1;

  if (forecastFromIndex === undefined || forecastFromIndex <= 0 || forecastFromIndex > lastIndex) {
    return [{ d: buildMultiLineSmoothPath(data, 0, lastIndex, count, plotY), dashed: false }];
  }

  return [
    { d: buildMultiLineSmoothPath(data, 0, forecastFromIndex, count, plotY), dashed: false },
    { d: buildMultiLineSmoothPath(data, forecastFromIndex, lastIndex, count, plotY), dashed: true },
  ];
}

function getMultiLineNiceDomainMax(maxValue: number, step = 50_000_000) {
  return Math.max(step, Math.ceil(maxValue / step) * step);
}

function getNearestMultiLinePointIndex(pointerRatio: number, count: number) {
  if (count <= 1) return 0;

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < count; index += 1) {
    const pointRatio = multiLinePlotXPercent(index, count) / 100;
    const distance = Math.abs(pointerRatio - pointRatio);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

const CHART_LEGEND_LABEL_CLASS =
  "text-[length:var(--ds-chart-label-size)] leading-none text-[var(--ds-chart-axis)]";

function ChartSeriesLegendSwatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex w-3 shrink-0 items-center justify-center"
      style={{ height: "var(--ds-chart-label-size)" }}
    >
      <span className="block h-0.5 w-full rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function MultiLineChartHoverCallout({
  monthLabel,
  rows,
  anchorPercent,
  flipLeft,
}: {
  monthLabel: string;
  rows: { label: string; value: string; color: string; muted?: boolean }[];
  anchorPercent: number;
  flipLeft: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute top-2 z-[4] min-w-[156px] rounded-[var(--ds-radius-sm)] border border-[var(--ds-chart-panel-border)] bg-[color-mix(in_oklab,var(--ds-chart-panel)_88%,var(--ds-background))] px-2.5 py-2 shadow-[var(--ds-shadow-sm)]"
      style={{
        left: `${anchorPercent}%`,
        transform: flipLeft ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
      }}
    >
      <p className="text-[length:var(--ds-chart-annotation-size)] font-semibold uppercase tracking-[0.05em] text-[var(--ds-chart-axis)]">
        {monthLabel}
      </p>
      <div className="mt-1.5 flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <ChartSeriesLegendSwatch color={row.color} />
              <span className={`truncate ${CHART_LEGEND_LABEL_CLASS}`} style={{ opacity: row.muted ? 0.72 : 0.92 }}>
                {row.label}
              </span>
            </div>
            <span
              className="shrink-0 text-[length:var(--ds-chart-label-size)] font-semibold tabular-nums text-[var(--ds-card-foreground)]"
              style={{ opacity: row.muted ? 0.82 : 1 }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MultiLineChartPrimitive({
  title,
  series,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  colorMode = "categorical",
  domainMax: domainMaxProp,
  yAxisStep = 50_000_000,
  formatYLabel,
  showAllXLabels = false,
  todayIndex,
  forecastDasharray = "4 4",
  embedded = false,
  embeddedContentClassName = "px-4 pb-3",
}: {
  title?: string;
  series: LineSeries[];
  insight?: string;
  status?: ChartStatus;
  showDelta?: boolean;
  delta?: string;
  hoverCard?: BaseChartProps<unknown>["hoverCard"];
  colorMode?: ChartColorMode;
  domainMax?: number;
  yAxisStep?: number;
  formatYLabel?: (value: number) => string;
  showAllXLabels?: boolean;
  todayIndex?: number;
  forecastDasharray?: string;
  embedded?: boolean;
  embeddedContentClassName?: string;
}) {
  const w = MULTI_LINE_VIEW_WIDTH;
  const h = MULTI_LINE_VIEW_HEIGHT;
  const pad = MULTI_LINE_VIEW_PAD;
  const n = series[0]?.data.length ?? 0;
  const dataMax = Math.max(1, ...series.flatMap((line) => line.data.map((point) => point.value)));
  const domainMax = domainMaxProp ?? getMultiLineNiceDomainMax(dataMax * 1.02, yAxisStep);
  const plotMinWidth = Math.max(n * MULTI_LINE_MIN_POINT_WIDTH_PX, 280);
  const yTicks = Array.from({ length: domainMax / yAxisStep + 1 }, (_, index) => index * yAxisStep);
  const formatTick = formatYLabel ?? ((value: number) => String(value));

  function plotY(value: number) {
    return h - pad - (value / domainMax) * (h - pad * 2);
  }

  function plotYPercent(value: number) {
    return (plotY(value) / h) * 100;
  }

  function seriesColor(line: LineSeries, index: number) {
    return line.color ?? dataColor({ index, state: "default", colorMode, status });
  }

  const xLabels = series[0]?.data.map((pt) => pt.key) ?? [];
  const maxLabels = 8;
  const labelStep = n <= maxLabels ? 1 : Math.ceil(n / maxLabels);
  const gradientPrefix = useId().replace(/:/g, "");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const formatPointValue = formatYLabel ?? ((value: number) => String(value));

  function handlePlotMouseMove(event: MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || n <= 0) return;

    const pointerRatio = (event.clientX - bounds.left) / bounds.width;
    setHoveredIndex(getNearestMultiLinePointIndex(pointerRatio, n));
  }

  function handlePlotMouseLeave() {
    setHoveredIndex(null);
  }

  const hoveredMonthLabel = hoveredIndex !== null ? xLabels[hoveredIndex] : null;
  const hoveredAnchorPercent = hoveredIndex !== null ? multiLinePlotXPercent(hoveredIndex, n) : 0;
  const flipHoverCalloutLeft = hoveredIndex !== null && hoveredIndex > n / 2;

  return (
    <ChartFrame
      title={title}
      insight={insight}
      status={status}
      showDelta={showDelta}
      delta={delta}
      hoverCard={hoverCard}
      embedded={embedded}
    >
      <div
        className={
          embedded
            ? `flex min-h-0 flex-1 flex-col ${embeddedContentClassName}`
            : "rounded-[var(--ds-radius-sm)] bg-[var(--ds-chart-surface)] px-[var(--ds-space-2)] pb-[var(--ds-space-2)] pt-[var(--ds-space-1)]"
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1">
          <div className="relative mr-2 w-14 shrink-0 self-stretch">
            {yTicks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2 text-right text-[length:var(--ds-chart-label-size)] tabular-nums text-[var(--ds-chart-axis)] opacity-[0.88]"
                style={{ top: `${plotYPercent(tick)}%` }}
              >
                {formatTick(tick)}
              </span>
            ))}
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-h-0 flex-col" style={{ minWidth: plotMinWidth }}>
              <div
                className={
                  embedded
                    ? "relative min-h-64 flex-1 border-b border-[var(--ds-chart-grid)] px-0.5 pb-2"
                    : "relative h-64 border-b border-[var(--ds-chart-grid)] px-0.5 pb-2"
                }
                onMouseMove={handlePlotMouseMove}
                onMouseLeave={handlePlotMouseLeave}
              >
                {todayIndex !== undefined && todayIndex >= 0 && todayIndex < n ? (
                  <span
                    className="pointer-events-none absolute inset-y-0 z-[1] border-l border-[var(--ds-chart-axis)]"
                    style={{
                      left: `${multiLinePlotXPercent(todayIndex, n)}%`,
                      opacity: 0.28,
                    }}
                    aria-hidden
                  />
                ) : null}
                {hoveredIndex !== null && hoveredIndex !== todayIndex ? (
                  <span
                    className="pointer-events-none absolute inset-y-0 z-[2] border-l border-[var(--ds-chart-axis)]"
                    style={{
                      left: `${multiLinePlotXPercent(hoveredIndex, n)}%`,
                      opacity: 0.16,
                    }}
                    aria-hidden
                  />
                ) : null}
                {yTicks.slice(1).map((tick) => (
                  <span
                    key={tick}
                    className="pointer-events-none absolute inset-x-0 border-t border-[var(--ds-chart-grid)]"
                    style={{ top: `${plotYPercent(tick)}%`, opacity: "var(--ds-chart-grid-opacity)" }}
                    aria-hidden
                  />
                ))}
                <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden preserveAspectRatio="none">
                  <defs>
                    {series.map((line, lineIndex) => {
                      if (!line.fillUnder) return null;

                      const fillColor = seriesColor(line, lineIndex);
                      const gradientId = `${gradientPrefix}-fill-${lineIndex}`;

                      return (
                        <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={fillColor} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  {series.map((line, lineIndex) => {
                    if (!line.fillUnder) return null;

                    const gradientId = `${gradientPrefix}-fill-${lineIndex}`;
                    const areaPath = buildMultiLineAreaPath(line.data, 0, n - 1, n, plotY, h, pad);

                    return (
                      <path
                        key={`${line.label}-fill`}
                        d={areaPath}
                        fill={`url(#${gradientId})`}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                  {series.map((line, lineIndex) => {
                    const stroke = seriesColor(line, lineIndex);
                    const segments = buildMultiLineSegments(
                      line.data,
                      n,
                      plotY,
                      line.forecastFromIndex,
                    );

                    return segments.map((segment, segmentIndex) => (
                      <path
                        key={`${line.label}-${segmentIndex}`}
                        d={segment.d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth="var(--ds-chart-line-width)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={segment.dashed ? forecastDasharray : undefined}
                        opacity={segment.dashed ? "0.72" : "var(--ds-chart-opacity-default)"}
                        vectorEffect="non-scaling-stroke"
                      />
                    ));
                  })}
                </svg>
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                  {series.map((line, lineIndex) =>
                    line.data.map((point, pointIndex) => {
                      const isHovered = pointIndex === hoveredIndex;
                      const isForecast =
                        line.forecastFromIndex !== undefined && pointIndex > line.forecastFromIndex;

                      return (
                        <span
                          key={`${line.label}-${point.key}-${pointIndex}`}
                          className={
                            isHovered
                              ? "absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--ds-background)] shadow-[var(--ds-shadow-sm)]"
                              : "absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--ds-chart-panel)]"
                          }
                          style={{
                            left: `${multiLinePlotXPercent(pointIndex, n)}%`,
                            top: `${plotYPercent(point.value)}%`,
                            backgroundColor: seriesColor(line, lineIndex),
                            opacity: isHovered ? 1 : isForecast ? "0.72" : STATE_OPACITY_VAR.default,
                          }}
                        />
                      );
                    }),
                  )}
                </div>
                {hoveredIndex !== null && hoveredMonthLabel ? (
                  <MultiLineChartHoverCallout
                    monthLabel={hoveredMonthLabel}
                    anchorPercent={hoveredAnchorPercent}
                    flipLeft={flipHoverCalloutLeft}
                    rows={series.map((line, lineIndex) => ({
                      label: line.label,
                      value: formatPointValue(line.data[hoveredIndex]?.value ?? 0),
                      color: seriesColor(line, lineIndex),
                      muted:
                        line.forecastFromIndex !== undefined && hoveredIndex > line.forecastFromIndex,
                    }))}
                  />
                ) : null}
              </div>
              <div className="relative mt-1.5 h-4 px-0.5">
                {xLabels.map((label, i) => {
                  if (!showAllXLabels && i !== 0 && i !== n - 1 && i % labelStep !== 0) return null;

                  return (
                    <span
                      key={`${label}-${i}`}
                      className="absolute top-0 max-w-[4.5rem] -translate-x-1/2 truncate text-center text-[length:var(--ds-chart-label-size)] text-[var(--ds-chart-axis)] opacity-[0.88]"
                      style={{ left: `${multiLinePlotXPercent(i, n)}%` }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex min-w-0 justify-center">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {series.map((line, i) => (
              <div key={line.label} className="flex items-center gap-1.5">
                <ChartSeriesLegendSwatch color={seriesColor(line, i)} />
                <span className={`${CHART_LEGEND_LABEL_CLASS} opacity-[0.88]`}>{line.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}

export function LineChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<PointDatum[]>) {
  const w = 100;
  const h = 44;
  const pad = 4;
  const n = data.length;

  const path = data
    .map((pt, i) => {
      const x = pad + normalizedIndex(i, n) * (w - pad * 2);
      const y = h - pad - (pt.value / 100) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible" aria-hidden>
        {[0, 0.33, 0.66, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={pad + t * (h - pad * 2)}
            y2={pad + t * (h - pad * 2)}
            stroke="var(--ds-chart-grid)"
            strokeOpacity="var(--ds-chart-grid-opacity)"
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke={statusColor(status)}
          strokeWidth="var(--ds-chart-line-width)"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="var(--ds-chart-opacity-default)"
        />
        {data.map((pt, i) => {
          const x = pad + normalizedIndex(i, n) * (w - pad * 2);
          const y = h - pad - (pt.value / 100) * (h - pad * 2);
          const state = dataStateForIndex(i, highlightIndex, variant);
          return (
            <circle
              key={pt.key}
              cx={x}
              cy={y}
              r={state === "highlight" ? "var(--ds-chart-point-size-highlight)" : "var(--ds-chart-point-size-default)"}
              fill={dataColor({ index: i, state, colorMode, status })}
              fillOpacity={STATE_OPACITY_VAR[state]}
            />
          );
        })}
      </svg>
    </ChartFrame>
  );
}

function AreaChartPrimitive({
  gradientId,
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<PointDatum[]> & { gradientId: string }) {
  const areaStroke = colorMode === "categorical" ? seriesColor(0) : statusColor(status);
  const w = 100;
  const h = 44;
  const pad = 4;
  const n = data.length;

  const linePath = data
    .map((pt, i) => {
      const x = pad + normalizedIndex(i, n) * (w - pad * 2);
      const y = h - pad - (pt.value / 100) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPath = `${linePath} L ${(w - pad).toFixed(2)} ${(h - pad).toFixed(2)} L ${pad} ${(h - pad).toFixed(2)} Z`;

  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaStroke} stopOpacity="var(--ds-chart-area-opacity-top)" />
            <stop offset="100%" stopColor={areaStroke} stopOpacity="var(--ds-chart-area-opacity-bottom)" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={pad + t * (h - pad * 2)}
            y2={pad + t * (h - pad * 2)}
            stroke="var(--ds-chart-grid)"
            strokeOpacity="var(--ds-chart-grid-opacity)"
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={areaStroke}
          strokeWidth="var(--ds-chart-line-width)"
          strokeLinecap="round"
          opacity="var(--ds-chart-opacity-default)"
        />
        {data.map((pt, i) => {
          const state = dataStateForIndex(i, highlightIndex, variant);
          if (state === "default") return null;
          const x = pad + normalizedIndex(i, n) * (w - pad * 2);
          const y = h - pad - (pt.value / 100) * (h - pad * 2);
          return (
            <circle
              key={pt.key}
              cx={x}
              cy={y}
              r={state === "highlight" ? "var(--ds-chart-point-size-highlight)" : "var(--ds-chart-point-size-default)"}
              fill={dataColor({ index: i, state, colorMode, status })}
              fillOpacity={STATE_OPACITY_VAR[state]}
            />
          );
        })}
      </svg>
    </ChartFrame>
  );
}

function ScatterChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightKey,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<ScatterDatum[]>) {
  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <svg viewBox="0 0 100 80" className="w-full" aria-hidden>
        <rect x="4" y="4" width="92" height="72" fill="none" stroke="var(--ds-chart-grid)" strokeWidth="var(--ds-chart-stroke-width-default)" />
        {data.map((point, i) => {
          const state = dataStateForKey(point.key, highlightKey, variant);
          const radius = state === "highlight" ? 4.8 : 4;
          return (
            <circle
              key={point.key}
              cx={point.x}
              cy={80 - point.y}
              r={radius}
              fill={dataColor({ index: i, state, colorMode, status })}
              style={{ opacity: STATE_OPACITY_VAR[state] }}
            />
          );
        })}
      </svg>
    </ChartFrame>
  );
}

function SparklineKpiPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<SparkDatum>) {
  const w = 120;
  const h = 32;
  const max = Math.max(...data, 1);
  const path = data
    .map((value, i) => {
      const x = normalizedIndex(i, data.length) * w;
      const y = h - (value / max) * (h - 4);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <div className="flex items-center justify-between gap-3 py-1">
        <div className="flex flex-col gap-1">
          <span className="text-[var(--ds-chart-kpi-size)] font-semibold tabular-nums leading-none tracking-tight text-[var(--ds-card-foreground)]">4.2k</span>
          {showDelta && delta ? (
            <span className="text-[length:var(--ds-chart-label-size)] font-medium" style={{ color: STATUS_COLOR_VAR[status] }}>
              {delta}
            </span>
          ) : null}
        </div>
        <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
          <path d={path} fill="none" stroke={statusColor(status)} strokeWidth="var(--ds-chart-line-width)" strokeLinecap="round" strokeLinejoin="round" />
          {highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < data.length ? (
            (() => {
              const x = normalizedIndex(highlightIndex, data.length) * w;
              const y = h - (data[highlightIndex] / max) * (h - 4);
              const pointIndex = highlightIndex;
              const state = dataStateForIndex(pointIndex, highlightIndex, variant);
              return (
                <circle
                  cx={x}
                  cy={y}
                  r={state === "highlight" ? "var(--ds-chart-point-size-highlight)" : "var(--ds-chart-point-size-default)"}
                  fill={statusColor(status)}
                  fillOpacity={STATE_OPACITY_VAR[state]}
                />
              );
            })()
          ) : null}
        </svg>
      </div>
    </ChartFrame>
  );
}

function ComboChartPrimitive({
  title,
  data,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  highlightIndex,
  variant = "comparison",
  colorMode = "monochrome",
}: BaseChartProps<PointDatum[]>) {
  const linePoints = [34, 28, 30, 22, 26, 18];
  const lineStroke = colorMode === "categorical" ? seriesColor(0) : statusColor(status);
  return (
    <ChartFrame title={title} insight={insight} status={status} showDelta={showDelta} delta={delta} hoverCard={hoverCard}>
      <svg viewBox="0 0 100 52" className="w-full" aria-hidden>
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1="4"
            x2="96"
            y1={8 + t * 36}
            y2={8 + t * 36}
            stroke="var(--ds-chart-grid)"
            strokeOpacity="var(--ds-chart-grid-opacity)"
            strokeWidth="var(--ds-chart-stroke-width-default)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((bar, i) => {
          const state = dataStateForIndex(i, highlightIndex, variant);
          return (
            <rect
              key={bar.key}
              x={12 + i * 16 - 5}
              y={44 - (bar.value / 100) * 28}
              width="10"
              height={(bar.value / 100) * 28}
              rx="1"
              fill={dataColor({ index: i, state, colorMode, status })}
              fillOpacity={STATE_OPACITY_VAR[state]}
            />
          );
        })}
        <path
          d={`M 10 ${linePoints[0]} L 26 ${linePoints[1]} L 42 ${linePoints[2]} L 58 ${linePoints[3]} L 74 ${linePoints[4]} L 90 ${linePoints[5]}`}
          fill="none"
          stroke={lineStroke}
          strokeWidth="var(--ds-chart-line-width)"
          strokeLinecap="round"
        />
      </svg>
    </ChartFrame>
  );
}

function ChartInteractionRow({
  label,
  base,
  interaction,
}: {
  label: string;
  base: ReactNode;
  interaction: ReactNode;
}) {
  return (
    <section className="space-y-[var(--ds-space-2)]">
      <p className="text-[length:var(--ds-chart-label-size)] uppercase tracking-[0.08em] text-[var(--ds-chart-axis)] opacity-[0.78]">
        {label}
      </p>
      <div className="grid gap-[var(--ds-chart-grid-gap)] lg:grid-cols-2">
        {base}
        {interaction}
      </div>
    </section>
  );
}

export function ChartShowcase({ uniqueId }: { uniqueId: string }) {
  const areaGradientId = `${uniqueId}-area-gradient`;
  const areaInteractionGradientId = `${uniqueId}-area-gradient-interaction`;

  const scatterData: ScatterDatum[] = [
    { key: "A", x: 12, y: 62 },
    { key: "B", x: 22, y: 38 },
    { key: "C", x: 35, y: 72 },
    { key: "D", x: 48, y: 28 },
    { key: "E", x: 58, y: 55 },
    { key: "F", x: 72, y: 42 },
    { key: "G", x: 85, y: 68 },
  ];

  const sparkData: SparkDatum = [4, 9, 7, 14, 11, 18, 15, 22, 19];

  return (
    <div className="flex flex-col gap-[var(--ds-chart-stack-gap)]">
      <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-panel)]/95 px-4 py-3 sm:px-5">
        <p className="text-[length:var(--ds-chart-label-size)] leading-relaxed text-[var(--ds-chart-axis)] opacity-[0.9]">
          Reusable chart primitives with tokenized states and status-driven insights. Right panel previews an interaction state.
        </p>
      </div>

      <ChartInteractionRow
        label="Pie"
        base={<PieChartPrimitive title="Pie" data={chartShowcasePieData} insight="Distribution" status="neutral" variant="default" />}
        interaction={
          <PieChartPrimitive
            title="Pie"
            data={chartShowcasePieData}
            insight="Hovered: C slice"
            status="neutral"
            variant="distribution"
            highlightIndex={2}
            hoverCard={{ label: "C", value: "20%", delta: "+2.1%", status: "positive" }}
          />
        }
      />

      <ChartInteractionRow
        label="Donut"
        base={
          <DonutChartPrimitive
            title="Donut"
            data={chartShowcasePieData}
            insight="Focus segment"
            status="positive"
            showDelta
            delta="+7%"
            variant="default"
          />
        }
        interaction={
          <DonutChartPrimitive
            title="Donut"
            data={chartShowcasePieData}
            insight="Hovered: B segment"
            status="positive"
            showDelta
            delta="+7%"
            variant="distribution"
            highlightIndex={1}
            hoverCard={{ label: "B", value: "25%", delta: "+1.4%", status: "positive" }}
          />
        }
      />

      <ChartInteractionRow
        label="Column"
        base={
          <ColumnChartPrimitive
            title="Column"
            data={chartShowcaseColumnData}
            insight="Comparison"
            status="neutral"
            showDelta
            delta="+9%"
            variant="default"
          />
        }
        interaction={
          <ColumnChartPrimitive
            title="Column"
            data={chartShowcaseColumnData}
            insight="Hovered: Apr"
            status="neutral"
            showDelta
            delta="+9%"
            variant="comparison"
            highlightIndex={3}
            hoverCard={{ label: "Apr", value: "82", delta: "+14 vs Mar", status: "positive" }}
          />
        }
      />

      <ChartInteractionRow
        label="Bar"
        base={<BarChartPrimitive title="Bar" data={chartShowcaseBarData} insight="Lead region" status="positive" showDelta delta="+16" variant="default" />}
        interaction={
          <BarChartPrimitive
            title="Bar"
            data={chartShowcaseBarData}
            insight="Hovered: East"
            status="positive"
            showDelta
            delta="+16"
            variant="comparison"
            highlightIndex={2}
            hoverCard={{ label: "East", value: "64", delta: "-8 vs South", status: "negative" }}
          />
        }
      />

      <ChartInteractionRow
        label="Line"
        base={
          <LineChartPrimitive
            title="Line"
            data={chartShowcaseLineData}
            insight="Momentum"
            status="positive"
            showDelta
            delta="+12%"
            variant="default"
          />
        }
        interaction={
          <LineChartPrimitive
            title="Line"
            data={chartShowcaseLineData}
            insight="Hovered: P5"
            status="positive"
            showDelta
            delta="+12%"
            variant="comparison"
            highlightIndex={4}
            hoverCard={{ label: "P5", value: "28", delta: "-4 from P4", status: "negative" }}
          />
        }
      />

      <ChartInteractionRow
        label="Area"
        base={
          <AreaChartPrimitive
            gradientId={areaGradientId}
            title="Area"
            data={chartShowcaseLineData}
            insight="Baseline shift"
            status="negative"
            showDelta
            delta="-5%"
            variant="default"
          />
        }
        interaction={
          <AreaChartPrimitive
            gradientId={areaInteractionGradientId}
            title="Area"
            data={chartShowcaseLineData}
            insight="Hovered: P6"
            status="negative"
            showDelta
            delta="-5%"
            variant="comparison"
            highlightIndex={5}
            hoverCard={{ label: "P6", value: "38", delta: "+10 from P5", status: "positive" }}
          />
        }
      />

      <ChartInteractionRow
        label="Scatter"
        base={<ScatterChartPrimitive title="Scatter" data={scatterData} insight="Cluster" status="neutral" variant="default" />}
        interaction={
          <ScatterChartPrimitive
            title="Scatter"
            data={scatterData}
            insight="Hovered: F point"
            status="neutral"
            variant="comparison"
            highlightKey="F"
            hoverCard={{ label: "Point F", value: "x:72 · y:42", delta: "segment B", status: "neutral" }}
          />
        }
      />

      <ChartInteractionRow
        label="Sparkline"
        base={
          <SparklineKpiPrimitive
            title="Sparkline"
            data={sparkData}
            insight="KPI trend"
            status="positive"
            showDelta
            delta="+12%"
            variant="default"
          />
        }
        interaction={
          <SparklineKpiPrimitive
            title="Sparkline"
            data={sparkData}
            insight="Hovered: latest point"
            status="positive"
            showDelta
            delta="+12%"
            variant="comparison"
            highlightIndex={8}
            hoverCard={{ label: "Latest", value: "19", delta: "+4 vs prev", status: "positive" }}
          />
        }
      />

      <ChartInteractionRow
        label="Combo"
        base={
          <ComboChartPrimitive
            title="Combo (line + column)"
            data={chartShowcaseColumnData}
            insight="Overlay"
            status="positive"
            showDelta
            delta="+4%"
            variant="default"
          />
        }
        interaction={
          <ComboChartPrimitive
            title="Combo (line + column)"
            data={chartShowcaseColumnData}
            insight="Hovered: Apr"
            status="positive"
            showDelta
            delta="+4%"
            variant="comparison"
            highlightIndex={3}
            hoverCard={{ label: "Apr", value: "82", delta: "margin 22%", status: "neutral" }}
          />
        }
      />
    </div>
  );
}
