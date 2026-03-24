import type { ReactNode } from "react";

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

function ChartFrame({
  title,
  insight,
  status = "neutral",
  showDelta = false,
  delta,
  hoverCard,
  children,
}: {
  title: string;
  insight: string;
  status?: ChartStatus;
  showDelta?: boolean;
  delta?: string;
  hoverCard?: BaseChartProps<unknown>["hoverCard"];
  children: ReactNode;
}) {
  const hoverStatus = hoverCard?.status ?? "neutral";
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-panel)]/95 p-[var(--ds-chart-panel-padding)]">
      <div className="mb-[var(--ds-chart-header-gap)] flex items-start justify-between gap-3">
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
        <span
          className="text-[length:var(--ds-chart-annotation-size)] font-semibold uppercase tracking-[0.045em]"
          style={{ color: STATUS_COLOR_VAR[status], opacity: 0.94 }}
        >
          {insight}
        </span>
      </div>
      <div className="relative">
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

function PieChartPrimitive({
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

function DonutChartPrimitive({
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

function ColumnChartPrimitive({
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

function BarChartPrimitive({
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

function LineChartPrimitive({
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
  const pieData: PieDatum[] = [
    { key: "A", value: 35 },
    { key: "B", value: 25 },
    { key: "C", value: 20 },
    { key: "D", value: 12 },
    { key: "E", value: 8 },
  ];

  const columnData: ColumnDatum[] = [
    { key: "Jan", value: 42 },
    { key: "Feb", value: 68 },
    { key: "Mar", value: 55 },
    { key: "Apr", value: 82 },
    { key: "May", value: 48 },
    { key: "Jun", value: 72 },
  ];

  const barData: ColumnDatum[] = [
    { key: "North", value: 88 },
    { key: "South", value: 72 },
    { key: "East", value: 64 },
    { key: "West", value: 52 },
    { key: "Central", value: 38 },
  ];

  const lineData: PointDatum[] = [
    { key: "P1", value: 8 },
    { key: "P2", value: 22 },
    { key: "P3", value: 18 },
    { key: "P4", value: 32 },
    { key: "P5", value: 28 },
    { key: "P6", value: 38 },
    { key: "P7", value: 34 },
    { key: "P8", value: 42 },
  ];

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
        base={<PieChartPrimitive title="Pie" data={pieData} insight="Distribution" status="neutral" variant="default" />}
        interaction={
          <PieChartPrimitive
            title="Pie"
            data={pieData}
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
            data={pieData}
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
            data={pieData}
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
            data={columnData}
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
            data={columnData}
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
        base={<BarChartPrimitive title="Bar" data={barData} insight="Lead region" status="positive" showDelta delta="+16" variant="default" />}
        interaction={
          <BarChartPrimitive
            title="Bar"
            data={barData}
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
            data={lineData}
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
            data={lineData}
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
            data={lineData}
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
            data={lineData}
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
            data={barData}
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
            data={barData}
            insight="Hovered: West bar"
            status="positive"
            showDelta
            delta="+4%"
            variant="comparison"
            highlightIndex={3}
            hoverCard={{ label: "West", value: "52", delta: "margin 22%", status: "neutral" }}
          />
        }
      />
    </div>
  );
}
