"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";
import {
  Area,
  ComposedChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelProps } from "recharts";
import {
  costAtPercentile,
  timeAtPercentile,
  percentileAtCost,
  percentileAtTime,
  barDataToCostCdf,
  barDataToTimeCdf,
  percentileFromSorted,
  deriveCostHistogramFromPercentiles,
  deriveTimeHistogramFromPercentiles,
  P10_DECILES,
  type CostCdfPoint,
  type TimeCdfPoint,
  type CostSummary,
  type TimeSummary,
} from "@/lib/simulationDisplayUtils";
import { formatDurationDays } from "@/lib/formatDuration";
import { riskaiPath } from "@/lib/routes";
import type { SimulationRiskSnapshot } from "@/domain/simulation/simulation.types";

const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 10, right: 16, left: 8, bottom: 28 };
const DISTRIBUTION_BIN_COUNT = 100;
const SIMULATION_TOP_RISKS_COUNT = 5;

/** Offset (px) to shift label left/right from the line so two labels on same row don't clash. */
const REF_LINE_LABEL_OFFSET_X = 8;

/** Max characters per line for reference line labels (approx 24px per line at 12px font). */
const REF_LINE_LABEL_MAX_CHARS = 24;

/** Splits a label into lines that fit within roughly REF_LINE_LABEL_MAX_CHARS, breaking at spaces when possible. */
function wrapRefLineLabel(text: string, maxChars: number = REF_LINE_LABEL_MAX_CHARS): string[] {
  if (!text.trim()) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (word.length > maxChars) {
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
        current = "";
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Renders reference line label at the bottom of the chart (below x-axis). Use offsetX to shift left (negative) or right (positive). Wraps long text into multiple lines. */
function RefLineLabelBottom({
  value,
  fontWeight = 500,
  offsetX = 0,
  viewBox,
  x: lineXProp,
  fill = "var(--ds-text-secondary)",
}: {
  value: string;
  viewBox?: LabelProps["viewBox"];
  x?: number;
  fontWeight?: number;
  /** Pixels to shift label from line: negative = left, positive = right. */
  offsetX?: number;
  fill?: string;
}) {
  // Recharts passes Cartesian or Polar viewBox; we only support Cartesian (x, y, width, height)
  if (!viewBox || !("width" in viewBox)) return null;
  const lineX = lineXProp ?? viewBox.x + viewBox.width / 2;
  const x = lineX + offsetX;
  const y = viewBox.y + viewBox.height + 14;
  const textAnchor = offsetX < 0 ? "end" : offsetX > 0 ? "start" : "middle";
  const lines = wrapRefLineLabel(value);
  const lineHeight = 14;
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      fontSize={12}
      fontWeight={fontWeight}
      fill={fill}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function formatCost(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCostCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}m`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}k`;
  return formatCost(value);
}

/** Gaussian KDE: evaluate density at evenly-spaced x-points from raw samples. */
const KDE_EVAL_POINTS = 200;

function gaussianKde(
  samples: number[],
  numPoints: number = KDE_EVAL_POINTS
): { x: number; density: number }[] {
  const n = samples.length;
  if (n === 0) return [];
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance) || 1;
  const bw = 1.6 * stddev * n ** -0.2;
  const pad = bw * 3;
  const lo = min - pad;
  const hi = max + pad;
  const step = (hi - lo) / (numPoints - 1);
  const inv2bwSq = 1 / (2 * bw * bw);
  const norm = 1 / (n * bw * Math.sqrt(2 * Math.PI));
  const out: { x: number; density: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    const x = lo + i * step;
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const d = x - sorted[j];
      sum += Math.exp(-d * d * inv2bwSq);
    }
    out.push({ x, density: sum * norm });
  }
  return out;
}

function kdeCost(
  samples: number[],
  numPoints: number = KDE_EVAL_POINTS
): { cost: number; barPct: number; smoothPct: number }[] {
  const raw = gaussianKde(samples, numPoints);
  if (raw.length === 0) return [];
  const peak = Math.max(...raw.map((p) => p.density));
  const scale = peak > 0 ? 100 / peak : 1;
  return raw.map((p) => ({
    cost: p.x,
    barPct: p.density * scale,
    smoothPct: p.density * scale,
  }));
}

function kdeTime(
  samples: number[],
  numPoints: number = KDE_EVAL_POINTS
): { time: number; barPct: number; smoothPct: number }[] {
  const raw = gaussianKde(samples, numPoints);
  if (raw.length === 0) return [];
  const peak = Math.max(...raw.map((p) => p.density));
  const scale = peak > 0 ? 100 / peak : 1;
  return raw.map((p) => ({
    time: p.x,
    barPct: p.density * scale,
    smoothPct: p.density * scale,
  }));
}

/** Simple moving-average fallback for percentile-derived histograms (no raw samples). */
function smoothBarPct(
  data: { cost: number; barPct: number }[],
  windowSize: number = 5
): { cost: number; barPct: number; smoothPct: number }[] {
  if (data.length === 0) return [];
  const half = Math.floor(windowSize / 2);
  return data.map((point, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sum += data[j].barPct;
      count++;
    }
    const smoothPct = count > 0 ? sum / count : point.barPct;
    return { cost: point.cost, barPct: point.barPct, smoothPct };
  });
}

function smoothBarPctTime(
  data: { time: number; barPct: number }[],
  windowSize: number = 5
): { time: number; barPct: number; smoothPct: number }[] {
  if (data.length === 0) return [];
  const half = Math.floor(windowSize / 2);
  return data.map((point, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(data.length - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = start; j <= end; j++) {
      sum += data[j].barPct;
      count++;
    }
    const smoothPct = count > 0 ? sum / count : point.barPct;
    return { time: point.time, barPct: point.barPct, smoothPct };
  });
}

export type SimulationSectionBaseline = {
  targetPNumeric: number;
  targetPLabel: string;
  /** For cost: approved budget in dollars. For time: fallback reference in days when `contingencyTimeDays` is omitted (planned duration); simulation time axis is risk delay days only. */
  approvedValue: number;
};

export type CostResults = {
  samples: number[] | null;
  summary: CostSummary | null;
  iterationCount: number;
  risks: SimulationRiskSnapshot[];
};

export type TimeResults = {
  samples: number[] | null;
  summary: TimeSummary | null;
  iterationCount: number;
  risks: SimulationRiskSnapshot[];
};

export type SimulationSectionProps = {
  title: "Cost Simulation" | "Schedule Simulation";
  mode: "cost" | "time";
  baseline: SimulationSectionBaseline;
  results: CostResults | TimeResults;
  isDebug?: boolean;
  /** Cost CDF for current P / delta (precomputed by page). */
  costCdf?: CostCdfPoint[] | null;
  /** Time CDF for current P / delta (precomputed by page). */
  timeCdf?: TimeCdfPoint[] | null;
  /** Extra label appended to the top-risks table title (e.g. "Top Cost Drivers (proxy)"). */
  tableSubtitle?: string | null;
  /** Format cost (dollars) for display in project unit (e.g. $m). If omitted, uses raw $ formatting. */
  formatCostValue?: (dollars: number) => string;
  /** For cost mode: contingency value in dollars. When provided, first tile = P at contingency; third tile = (cost at target P) − contingency. */
  contingencyValueDollars?: number | null;
  /**
   * For time mode: schedule contingency in days (risk delay buffer). Same units as simulation time samples.
   * When provided, first tile = P at this delay; second tile = (time at target P) − contingency days.
   */
  contingencyTimeDays?: number | null;
  /** Optional href for "Target P-Value" / settings link (debug only). When provided, used instead of /project. */
  settingsHref?: string | null;
};

/** RAG band fills use design-system semantic chart / warning tokens (SVG stopColor accepts CSS variables). */
const RAG_BAND_NEGATIVE = "var(--ds-chart-insight-negative)";
const RAG_BAND_POSITIVE = "var(--ds-chart-insight-positive)";
const RAG_BAND_NEUTRAL = "var(--ds-warning)";

/** Secondary emphasis for target / key percentile lines (below primary curve stroke). */
const CHART_TARGET_STROKE =
  "color-mix(in oklab, var(--ds-primary) 58%, var(--ds-muted-foreground))";

function CostChart({
  results,
  targetPNumeric,
  targetPLabel,
  isDebug,
  currentPCost,
  currentPLabel,
  deltaToTargetP,
}: {
  results: CostResults;
  targetPNumeric: number;
  targetPLabel: string;
  isDebug?: boolean;
  /** Cost at current P (e.g. contingency); vertical line on chart. */
  currentPCost?: number | null;
  /** Label for current P line, e.g. "P33". */
  currentPLabel?: string | null;
  /** Delta to target P (cost); used for RAG fill between current and target lines. */
  deltaToTargetP?: number | null;
}) {
  const { samples, summary, iterationCount } = results;
  const costSamples = useMemo(() => samples ?? [], [samples]);

  const { smoothData, deciles } = useMemo(() => {
    let smooth: { cost: number; barPct: number; smoothPct: number }[] = [];
    if (costSamples.length > 0) {
      smooth = kdeCost(costSamples);
    } else if (summary) {
      const dist = deriveCostHistogramFromPercentiles(summary, DISTRIBUTION_BIN_COUNT);
      const total = dist.reduce((s, d) => s + Number(d.frequency), 0);
      const div = total > 0 ? total : 1;
      const barData = dist.map((d) => ({
        cost: d.cost,
        barPct: (Number(d.frequency) / div) * 100,
      }));
      smooth = smoothBarPct(barData, 5);
    }
    const sorted = [...costSamples].sort((a, b) => a - b);
    const deciles =
      sorted.length > 0
        ? P10_DECILES.map((p) => ({ p, x: percentileFromSorted(sorted, p) }))
        : smooth.length > 0
          ? (() => {
              const c = barDataToCostCdf(smooth);
              return P10_DECILES.map((p) => ({
                p,
                x: costAtPercentile(c, p) ?? smooth[0]?.cost ?? 0,
              }));
            })()
          : [];
    return { smoothData: smooth, deciles };
  }, [costSamples, summary]);

  const chartData = useMemo(() => {
    if (smoothData.length === 0) return smoothData;
    const minCost = smoothData[0]?.cost ?? 0;
    let data = minCost <= 0 ? smoothData : [{ cost: 0, barPct: 0, smoothPct: 0 }, ...smoothData];
    const p100 = deciles.length > 0 ? Math.max(...deciles.map((d) => d.x)) : null;
    const lastCost = data[data.length - 1]?.cost ?? 0;
    if (p100 != null && p100 > lastCost) {
      data = [...data, { cost: p100, barPct: 0, smoothPct: 0 }];
    }
    return data;
  }, [smoothData, deciles]);

  const targetLineX = useMemo(
    () => deciles.find((d) => d.p === targetPNumeric)?.x ?? null,
    [deciles, targetPNumeric]
  );

  /** RAG-colored band between current P and target P: gradient color and x bounds. Darker end toward target. */
  const ragBand = useMemo(() => {
    if (
      currentPCost == null ||
      !Number.isFinite(currentPCost) ||
      targetLineX == null ||
      !Number.isFinite(targetLineX) ||
      deltaToTargetP == null
    )
      return null;
    const x1 = Math.min(currentPCost, targetLineX);
    const x2 = Math.max(currentPCost, targetLineX);
    const color =
      deltaToTargetP > 0 ? RAG_BAND_NEGATIVE : deltaToTargetP < 0 ? RAG_BAND_POSITIVE : RAG_BAND_NEUTRAL;
    const targetAtLeft = targetLineX <= currentPCost;
    return { x1, x2, color, targetAtLeft };
  }, [currentPCost, targetLineX, deltaToTargetP]);

  /** Interpolate smoothPct at a given cost from chart data. */
  const interpolateSmoothPct = useMemo(() => {
    return (data: { cost: number; smoothPct?: number }[], cost: number): number => {
      if (data.length === 0) return 0;
      const sorted = [...data].sort((a, b) => a.cost - b.cost);
      if (cost <= sorted[0]!.cost) return sorted[0]!.smoothPct ?? 0;
      if (cost >= sorted[sorted.length - 1]!.cost) return sorted[sorted.length - 1]!.smoothPct ?? 0;
      let i = 0;
      while (i < sorted.length - 1 && sorted[i + 1]!.cost < cost) i++;
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      const t = (cost - a.cost) / (b.cost - a.cost);
      return (a.smoothPct ?? 0) + t * ((b.smoothPct ?? 0) - (a.smoothPct ?? 0));
    };
  }, []);

  /** Chart data with ragBandPct: fill only between current and target lines, up to the curve. */
  const chartDataWithRagBand = useMemo(() => {
    const interp = interpolateSmoothPct;
    if (!ragBand) {
      return chartData.map((p) => ({ ...p, ragBandPct: null as number | null }));
    }
    const { x1, x2 } = ragBand;
    const withBand = chartData.map((p) => ({
      ...p,
      ragBandPct: p.cost >= x1 && p.cost <= x2 ? (p.smoothPct ?? 0) : null as number | null,
    }));
    const hasCost = (c: number) => withBand.some((p) => Math.abs(p.cost - c) < 1e-6);
    const points: { cost: number; barPct: number; smoothPct: number; ragBandPct: number | null }[] = [...withBand];
    if (!hasCost(x1)) {
      points.push({ cost: x1, barPct: 0, smoothPct: interp(chartData, x1), ragBandPct: interp(chartData, x1) });
    }
    if (!hasCost(x2)) {
      points.push({ cost: x2, barPct: 0, smoothPct: interp(chartData, x2), ragBandPct: interp(chartData, x2) });
    }
    return points.sort((a, b) => a.cost - b.cost);
  }, [chartData, ragBand, interpolateSmoothPct]);

  const decileCrossings = useMemo(() => {
    if (chartData.length === 0 || deciles.length === 0) return [];
    const sorted = [...chartData].sort((a, b) => a.cost - b.cost);
    const costMin = sorted[0]?.cost ?? 0;
    const costMax = sorted[sorted.length - 1]?.cost ?? costMin;
    return deciles
      .map((d) => {
        const x = d.x;
        if (x < costMin || x > costMax) return null;
        let i = 0;
        while (i < sorted.length - 1 && sorted[i + 1].cost < x) i++;
        const a = sorted[i];
        const b = sorted[i + 1];
        if (!a) return null;
        if (!b || a.cost === b.cost) return { p: d.p, x: a.cost, y: a.smoothPct ?? 0 };
        const t = (x - a.cost) / (b.cost - a.cost);
        const y = (a.smoothPct ?? 0) + t * ((b.smoothPct ?? 0) - (a.smoothPct ?? 0));
        return { p: d.p, x, y };
      })
      .filter((c): c is { p: number; x: number; y: number } => c != null);
  }, [chartData, deciles]);

  const currentFundingCurvePoint = useMemo(() => {
    if (currentPCost == null || !Number.isFinite(currentPCost) || chartData.length === 0) return null;
    const sorted = [...chartData].sort((a, b) => a.cost - b.cost);
    const costMin = sorted[0]!.cost;
    const costMax = sorted[sorted.length - 1]!.cost;
    if (currentPCost < costMin || currentPCost > costMax) return null;
    const y = interpolateSmoothPct(chartData, currentPCost);
    return { x: currentPCost, y };
  }, [chartData, currentPCost, interpolateSmoothPct]);

  const targetLineCurveY = useMemo(() => {
    if (targetLineX == null || !Number.isFinite(targetLineX) || chartData.length === 0) return null;
    const crossing = decileCrossings.find((c) => c.p === targetPNumeric);
    if (crossing) return crossing.y;
    const sorted = [...chartData].sort((a, b) => a.cost - b.cost);
    const costMin = sorted[0]!.cost;
    const costMax = sorted[sorted.length - 1]!.cost;
    if (targetLineX < costMin || targetLineX > costMax) return null;
    return interpolateSmoothPct(chartData, targetLineX);
  }, [chartData, decileCrossings, targetLineX, targetPNumeric, interpolateSmoothPct]);

  const tooltipValidCosts = useMemo(() => {
    const costs = decileCrossings.map((c) => c.x);
    if (targetLineX != null && Number.isFinite(targetLineX)) costs.push(targetLineX);
    if (currentPCost != null && Number.isFinite(currentPCost)) costs.push(currentPCost);
    return costs;
  }, [decileCrossings, targetLineX, currentPCost]);

  const tooltipMarkers = useMemo(() => {
    const list: { pLabel: string; cost: number }[] = decileCrossings.map((c) => ({
      pLabel: `P${c.p}`,
      cost: c.x,
    }));
    if (targetLineX != null && Number.isFinite(targetLineX) && targetPLabel) {
      list.push({ pLabel: `Target (${targetPLabel})`, cost: targetLineX });
    }
    if (currentPCost != null && Number.isFinite(currentPCost) && currentPLabel) {
      list.push({ pLabel: currentPLabel ? `Current Funding Position (${currentPLabel})` : "Current Funding Position", cost: currentPCost });
    }
    return list;
  }, [decileCrossings, targetLineX, targetPLabel, currentPCost, currentPLabel]);

  const costRange = useMemo(() => {
    if (chartData.length === 0) return 1;
    const costs = chartData.map((d) => d.cost);
    return Math.max(1, Math.max(...costs) - Math.min(...costs));
  }, [chartData]);

  const xDomain = useMemo((): [number, number] => {
    if (chartData.length === 0 && deciles.length === 0) return [0, 1];
    const costMax = chartData.length > 0 ? Math.max(...chartData.map((d) => d.cost)) : 0;
    const p100Max = deciles.length > 0 ? Math.max(...deciles.map((d) => d.x)) : 0;
    return [0, Math.max(costMax, p100Max, 1)];
  }, [chartData, deciles]);

  const [activeCost, setActiveCost] = useState<number | null>(null);
  const activeCostTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (activeCostTimeoutRef.current) clearTimeout(activeCostTimeoutRef.current); }, []);

  const costMarkerProximity = useMemo(() => {
    const binWidth = costRange / DISTRIBUTION_BIN_COUNT;
    if (tooltipValidCosts.length < 2) return Math.max(costRange * 0.02, binWidth);
    const sorted = [...tooltipValidCosts].sort((a, b) => a - b);
    let minGap = costRange;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1]! - sorted[i]!;
      if (gap > 0) minGap = Math.min(minGap, gap);
    }
    return Math.max(minGap * 0.35, binWidth);
  }, [tooltipValidCosts, costRange]);

  /** Only deciles we actually render (exclude P100) — active index is over this list so hover near P100 highlights P90. */
  const decileCrossingsVisible = useMemo(
    () => decileCrossings.filter((c) => c.p !== 100),
    [decileCrossings]
  );

  const activeCostDotIndex = useMemo(() => {
    if (activeCost == null || decileCrossingsVisible.length === 0) return -1;
    if (currentPCost != null && Math.abs(activeCost - currentPCost) < 1e-9) return -1;
    if (targetLineX != null && Number.isFinite(targetLineX) && Math.abs(activeCost - targetLineX) < 1e-9) return -1;
    let bestIdx = 0;
    let bestDist = Math.abs(decileCrossingsVisible[0]!.x - activeCost);
    for (let i = 1; i < decileCrossingsVisible.length; i++) {
      const d = Math.abs(decileCrossingsVisible[i]!.x - activeCost);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [activeCost, decileCrossingsVisible, currentPCost, targetLineX]);

  const yMax = useMemo(() => {
    if (smoothData.length === 0) return 5;
    const maxPct = smoothData.reduce((m, d) => Math.max(m, d.barPct ?? 0, d.smoothPct ?? 0), 0);
    const padded = maxPct * 1.25;
    const step = padded <= 5 ? 0.5 : padded <= 10 ? 1 : 2;
    return Math.ceil(padded / step) * step;
  }, [smoothData]);

  const empty = smoothData.length === 0;

  return (
    <Card className="overflow-hidden border border-[var(--ds-border-subtle)] shadow-none">
      <CardHeader className="border-b border-[var(--ds-border-subtle)] px-4 py-2.5">
        <CardTitle className="text-[length:var(--ds-text-sm)] font-semibold">Cost Distribution</CardTitle>
        {!empty && isDebug && (
          <p className="mt-0.5 m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {costSamples.length > 0
              ? `Monte Carlo (${iterationCount.toLocaleString()} iterations)`
              : "Derived from percentiles"}
          </p>
        )}
      </CardHeader>
      <CardContent
        className="flex w-full flex-col p-4"
        style={{ height: CHART_HEIGHT }}
      >
        {empty ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
            No data
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-muted)_22%,transparent)] text-[var(--ds-primary)]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartDataWithRagBand} margin={CHART_MARGIN}>
              <XAxis
                type="number"
                dataKey="cost"
                domain={xDomain}
                scale="linear"
                allowDataOverflow
                padding={{ left: 0, right: 0 }}
                tick={false}
                tickLine={false}
                axisLine={{ stroke: "var(--ds-border-subtle)", strokeOpacity: 1 }}
              />
              <YAxis hide domain={[0, yMax]} />
              <Tooltip
                cursor={false}
                offset={5}
                contentStyle={{
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "none",
                  padding: 0,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) {
                    if (activeCostTimeoutRef.current) clearTimeout(activeCostTimeoutRef.current);
                    activeCostTimeoutRef.current = setTimeout(() => setActiveCost(null), 0);
                    return null;
                  }
                  if (tooltipMarkers.length === 0) {
                    if (activeCostTimeoutRef.current) clearTimeout(activeCostTimeoutRef.current);
                    activeCostTimeoutRef.current = setTimeout(() => setActiveCost(null), 0);
                    return null;
                  }
                  const cost = Number(label);
                  const closest = tooltipMarkers.reduce(
                    (best, m) => (Math.abs(cost - m.cost) < Math.abs(cost - best.cost) ? m : best),
                    tooltipMarkers[0]!
                  );
                  const distToMarker = Math.abs(cost - closest.cost);
                  if (distToMarker > costMarkerProximity) {
                    if (activeCostTimeoutRef.current) clearTimeout(activeCostTimeoutRef.current);
                    activeCostTimeoutRef.current = setTimeout(() => setActiveCost(null), 0);
                    return null;
                  }
                  if (activeCostTimeoutRef.current) clearTimeout(activeCostTimeoutRef.current);
                  activeCostTimeoutRef.current = setTimeout(() => setActiveCost(closest.cost), 0);
                  return (
                    <div className="space-y-1.5 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-md)]">
                      <div className="font-semibold leading-tight text-[var(--ds-text-primary)]">{closest.pLabel}</div>
                      <div className="leading-snug text-[var(--ds-text-secondary)]">{formatCostCompact(closest.cost)}</div>
                    </div>
                  );
                }}
              />
              <defs>
                <linearGradient id="simDistDepthCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity={0.02} />
                </linearGradient>
                {ragBand && (
                  <linearGradient id="costChartRagFill" x1="0" y1="0" x2="1" y2="0">
                    {(() => {
                      const isGreen = ragBand.color === RAG_BAND_POSITIVE;
                      const darkerAtLeft = isGreen ? !ragBand.targetAtLeft : ragBand.targetAtLeft;
                      return darkerAtLeft ? (
                        <>
                          <stop offset="0%" stopColor={ragBand.color} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={ragBand.color} stopOpacity={0.08} />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor={ragBand.color} stopOpacity={0.08} />
                          <stop offset="100%" stopColor={ragBand.color} stopOpacity={0.28} />
                        </>
                      );
                    })()}
                  </linearGradient>
                )}
              </defs>
              <Area
                type="natural"
                dataKey="smoothPct"
                stroke="var(--ds-primary)"
                strokeWidth={2.5}
                fill="url(#simDistDepthCost)"
                fillOpacity={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              {ragBand && (
                <Area
                  type="natural"
                  dataKey="ragBandPct"
                  stroke="none"
                  fill="url(#costChartRagFill)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              )}
              {decileCrossingsVisible.map((c) => {
                const activeP =
                  activeCostDotIndex >= 0 ? decileCrossingsVisible[activeCostDotIndex]?.p : undefined;
                const isActive = activeP != null && c.p === activeP;
                return (
                  <ReferenceDot
                    key={c.p}
                    x={c.x}
                    y={c.y}
                    r={isActive ? 4.5 : 2.75}
                    fill="var(--ds-chart-annotation)"
                    stroke="var(--ds-surface-default)"
                    strokeWidth={1.25}
                  />
                );
              })}
              {currentFundingCurvePoint && (
                <ReferenceDot
                  key="current-funding"
                  x={currentFundingCurvePoint.x}
                  y={currentFundingCurvePoint.y}
                  r={
                    activeCost != null &&
                    currentPCost != null &&
                    Math.abs(activeCost - currentPCost) < 1e-9
                      ? 4.5
                      : 2.75
                  }
                  fill="color-mix(in oklab, var(--ds-chart-annotation) 72%, var(--ds-muted-foreground))"
                  stroke="var(--ds-surface-default)"
                  strokeWidth={1.25}
                />
              )}
              {targetLineX != null && Number.isFinite(targetLineX) && targetPLabel && (
                <ReferenceLine
                  segment={
                    targetLineCurveY != null
                      ? [{ x: targetLineX, y: 0 }, { x: targetLineX, y: targetLineCurveY }]
                      : undefined
                  }
                  x={targetLineCurveY == null ? targetLineX : undefined}
                  stroke={CHART_TARGET_STROKE}
                  strokeWidth={1.75}
                  strokeOpacity={1}
                  label={{
                    content: (p: LabelProps) => (
                      <RefLineLabelBottom
                        value={`Target (${targetPLabel})`}
                        fontWeight={500}
                        offsetX={deltaToTargetP != null && deltaToTargetP > 0 ? REF_LINE_LABEL_OFFSET_X : -REF_LINE_LABEL_OFFSET_X}
                        viewBox={p.viewBox}
                        x={p.x as number | undefined}
                        fill="var(--ds-text-secondary)"
                      />
                    ),
                  }}
                />
              )}
              {currentPCost != null && Number.isFinite(currentPCost) && currentPLabel && (
                currentFundingCurvePoint ? (
                  <ReferenceLine
                    segment={[{ x: currentPCost, y: 0 }, { x: currentPCost, y: currentFundingCurvePoint.y }]}
                    stroke="var(--ds-chart-annotation)"
                    strokeWidth={1.25}
                    strokeOpacity={0.62}
                    strokeDasharray="4 4"
                    label={{
                      content: (p: LabelProps) => (
                        <RefLineLabelBottom
                          value={currentPLabel ? `Current Funding Position (${currentPLabel})` : "Current Funding Position"}
                          fontWeight={500}
                          offsetX={deltaToTargetP != null && deltaToTargetP > 0 ? -REF_LINE_LABEL_OFFSET_X : REF_LINE_LABEL_OFFSET_X}
                          viewBox={p.viewBox}
                          x={p.x as number | undefined}
                          fill="var(--ds-text-muted)"
                        />
                      ),
                    }}
                  />
                ) : (
                  <ReferenceLine
                    x={currentPCost}
                    stroke="var(--ds-chart-annotation)"
                    strokeWidth={1.25}
                    strokeOpacity={0.62}
                    strokeDasharray="4 4"
                    label={{
                      content: (p: LabelProps) => (
                        <RefLineLabelBottom
                          value={currentPLabel ? `Current Funding Position (${currentPLabel})` : "Current Funding Position"}
                          fontWeight={500}
                          offsetX={deltaToTargetP != null && deltaToTargetP > 0 ? -REF_LINE_LABEL_OFFSET_X : REF_LINE_LABEL_OFFSET_X}
                          viewBox={p.viewBox}
                          x={p.x as number | undefined}
                          fill="var(--ds-text-muted)"
                        />
                      ),
                    }}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimeChart({
  results,
  targetPNumeric,
  targetPLabel,
  isDebug,
  currentPTime,
  currentPLabel,
  deltaToTargetP,
}: {
  results: TimeResults;
  targetPNumeric: number;
  targetPLabel: string;
  isDebug?: boolean;
  /** Delay (days) at current P; vertical reference on chart (matches cost chart current line). */
  currentPTime?: number | null;
  currentPLabel?: string | null;
  deltaToTargetP?: number | null;
}) {
  const { samples, summary, iterationCount } = results;
  const timeSamples = useMemo(() => samples ?? [], [samples]);

  const { smoothData, deciles } = useMemo(() => {
    let smooth: { time: number; barPct: number; smoothPct: number }[] = [];
    if (timeSamples.length > 0) {
      smooth = kdeTime(timeSamples);
    } else if (summary) {
      const dist = deriveTimeHistogramFromPercentiles(summary, DISTRIBUTION_BIN_COUNT);
      const total = dist.reduce((s, d) => s + Number(d.frequency), 0);
      const div = total > 0 ? total : 1;
      const barData = dist.map((d) => ({
        time: d.time,
        barPct: (Number(d.frequency) / div) * 100,
      }));
      smooth = smoothBarPctTime(barData, 5);
    }
    const sorted = [...timeSamples].sort((a, b) => a - b);
    const deciles =
      sorted.length > 0
        ? P10_DECILES.map((p) => ({ p, x: percentileFromSorted(sorted, p) }))
        : smooth.length > 0
          ? (() => {
              const c = barDataToTimeCdf(smooth);
              return P10_DECILES.map((p) => ({
                p,
                x: timeAtPercentile(c, p) ?? smooth[0]?.time ?? 0,
              }));
            })()
          : [];
    return { smoothData: smooth, deciles };
  }, [timeSamples, summary, iterationCount]);

  const chartData = useMemo(() => {
    if (smoothData.length === 0) return smoothData;
    const minTime = smoothData[0]?.time ?? 0;
    let data = minTime <= 0 ? smoothData : [{ time: 0, barPct: 0, smoothPct: 0 }, ...smoothData];
    const p100 = deciles.length > 0 ? Math.max(...deciles.map((d) => d.x)) : null;
    const lastTime = data[data.length - 1]?.time ?? 0;
    if (p100 != null && p100 > lastTime) {
      data = [...data, { time: p100, barPct: 0, smoothPct: 0 }];
    }
    return data;
  }, [smoothData, deciles]);

  /** Interpolate smoothPct at a given time from chart data (same role as cost chart). */
  const interpolateSmoothPctAtTime = useMemo(() => {
    return (data: { time: number; smoothPct?: number }[], timeVal: number): number => {
      if (data.length === 0) return 0;
      const sorted = [...data].sort((a, b) => a.time - b.time);
      if (timeVal <= sorted[0]!.time) return sorted[0]!.smoothPct ?? 0;
      if (timeVal >= sorted[sorted.length - 1]!.time) return sorted[sorted.length - 1]!.smoothPct ?? 0;
      let i = 0;
      while (i < sorted.length - 1 && sorted[i + 1]!.time < timeVal) i++;
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      const t = (timeVal - a.time) / (b.time - a.time);
      return (a.smoothPct ?? 0) + t * ((b.smoothPct ?? 0) - (a.smoothPct ?? 0));
    };
  }, []);

  const decileCrossings = useMemo(() => {
    if (chartData.length === 0 || deciles.length === 0) return [];
    const sorted = [...chartData].sort((a, b) => a.time - b.time);
    const timeMin = sorted[0]?.time ?? 0;
    const timeMax = sorted[sorted.length - 1]?.time ?? timeMin;
    return deciles
      .map((d) => {
        const x = d.x;
        if (x < timeMin || x > timeMax) return null;
        let i = 0;
        while (i < sorted.length - 1 && sorted[i + 1].time < x) i++;
        const a = sorted[i];
        const b = sorted[i + 1];
        if (!a) return null;
        if (!b || a.time === b.time) return { p: d.p, x: a.time, y: a.smoothPct ?? 0 };
        const t = (x - a.time) / (b.time - a.time);
        const y = (a.smoothPct ?? 0) + t * ((b.smoothPct ?? 0) - (a.smoothPct ?? 0));
        return { p: d.p, x, y };
      })
      .filter((c): c is { p: number; x: number; y: number } => c != null);
  }, [chartData, deciles]);

  const targetLineX = useMemo(
    () => deciles.find((d) => d.p === targetPNumeric)?.x ?? null,
    [deciles, targetPNumeric]
  );

  const ragBand = useMemo(() => {
    if (
      currentPTime == null ||
      !Number.isFinite(currentPTime) ||
      targetLineX == null ||
      !Number.isFinite(targetLineX) ||
      deltaToTargetP == null
    )
      return null;
    const x1 = Math.min(currentPTime, targetLineX);
    const x2 = Math.max(currentPTime, targetLineX);
    const color =
      deltaToTargetP > 0 ? RAG_BAND_NEGATIVE : deltaToTargetP < 0 ? RAG_BAND_POSITIVE : RAG_BAND_NEUTRAL;
    const targetAtLeft = targetLineX <= currentPTime;
    return { x1, x2, color, targetAtLeft };
  }, [currentPTime, targetLineX, deltaToTargetP]);

  const chartDataWithRagBand = useMemo(() => {
    const interp = interpolateSmoothPctAtTime;
    if (!ragBand) {
      return chartData.map((p) => ({ ...p, ragBandPct: null as number | null }));
    }
    const { x1, x2 } = ragBand;
    const withBand = chartData.map((p) => ({
      ...p,
      ragBandPct: p.time >= x1 && p.time <= x2 ? (p.smoothPct ?? 0) : null as number | null,
    }));
    const hasTime = (t: number) => withBand.some((p) => Math.abs(p.time - t) < 1e-6);
    const points: { time: number; barPct: number; smoothPct: number; ragBandPct: number | null }[] = [...withBand];
    if (!hasTime(x1)) {
      points.push({ time: x1, barPct: 0, smoothPct: interp(chartData, x1), ragBandPct: interp(chartData, x1) });
    }
    if (!hasTime(x2)) {
      points.push({ time: x2, barPct: 0, smoothPct: interp(chartData, x2), ragBandPct: interp(chartData, x2) });
    }
    return points.sort((a, b) => a.time - b.time);
  }, [chartData, ragBand, interpolateSmoothPctAtTime]);

  const targetLineCurveY = useMemo(() => {
    if (targetLineX == null || !Number.isFinite(targetLineX) || chartData.length === 0) return null;
    const crossing = decileCrossings.find((c) => c.p === targetPNumeric);
    if (crossing) return crossing.y;
    const sorted = [...chartData].sort((a, b) => a.time - b.time);
    const timeMin = sorted[0]!.time;
    const timeMax = sorted[sorted.length - 1]!.time;
    if (targetLineX < timeMin || targetLineX > timeMax) return null;
    return interpolateSmoothPctAtTime(chartData, targetLineX);
  }, [chartData, decileCrossings, targetLineX, targetPNumeric, interpolateSmoothPctAtTime]);

  const currentScheduleCurvePoint = useMemo(() => {
    if (currentPTime == null || !Number.isFinite(currentPTime) || chartData.length === 0) return null;
    const sorted = [...chartData].sort((a, b) => a.time - b.time);
    const timeMin = sorted[0]!.time;
    const timeMax = sorted[sorted.length - 1]!.time;
    if (currentPTime < timeMin || currentPTime > timeMax) return null;
    const y = interpolateSmoothPctAtTime(chartData, currentPTime);
    return { x: currentPTime, y };
  }, [chartData, currentPTime, interpolateSmoothPctAtTime]);

  const tooltipValidTimes = useMemo(() => {
    const times = decileCrossings.map((c) => c.x);
    if (targetLineX != null && Number.isFinite(targetLineX)) times.push(targetLineX);
    if (currentPTime != null && Number.isFinite(currentPTime)) times.push(currentPTime);
    return times;
  }, [decileCrossings, targetLineX, currentPTime]);

  const tooltipMarkers = useMemo(() => {
    const list: { pLabel: string; time: number }[] = decileCrossings.map((c) => ({
      pLabel: `P${c.p}`,
      time: c.x,
    }));
    if (targetLineX != null && Number.isFinite(targetLineX) && targetPLabel) {
      list.push({ pLabel: `Target (${targetPLabel})`, time: targetLineX });
    }
    if (currentPTime != null && Number.isFinite(currentPTime) && currentPLabel) {
      list.push({
        pLabel: currentPLabel ? `Current Schedule Position (${currentPLabel})` : "Current Schedule Position",
        time: currentPTime,
      });
    }
    return list;
  }, [decileCrossings, targetLineX, targetPLabel, currentPTime, currentPLabel]);

  const timeRange = useMemo(() => {
    if (chartData.length === 0) return 1;
    const times = chartData.map((d) => d.time);
    return Math.max(1, Math.max(...times) - Math.min(...times));
  }, [chartData]);

  const xDomain = useMemo((): [number, number] => {
    if (chartData.length === 0 && deciles.length === 0) return [0, 1];
    const timeMax = chartData.length > 0 ? Math.max(...chartData.map((d) => d.time)) : 0;
    const p100Max = deciles.length > 0 ? Math.max(...deciles.map((d) => d.x)) : 0;
    return [0, Math.max(timeMax, p100Max, 1)];
  }, [chartData, deciles]);

  const [activeTime, setActiveTime] = useState<number | null>(null);
  const activeTimeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (activeTimeTimeoutRef.current) clearTimeout(activeTimeTimeoutRef.current); }, []);

  const timeMarkerProximity = useMemo(() => {
    const binWidth = timeRange / DISTRIBUTION_BIN_COUNT;
    if (tooltipValidTimes.length < 2) return Math.max(timeRange * 0.02, binWidth);
    const sorted = [...tooltipValidTimes].sort((a, b) => a - b);
    let minGap = timeRange;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1]! - sorted[i]!;
      if (gap > 0) minGap = Math.min(minGap, gap);
    }
    return Math.max(minGap * 0.35, binWidth);
  }, [tooltipValidTimes, timeRange]);

  /** Only deciles we actually render (exclude P100) — active index is over this list so hover near P100 highlights P90. */
  const decileCrossingsVisible = useMemo(
    () => decileCrossings.filter((c) => c.p !== 100),
    [decileCrossings]
  );

  const activeTimeDotIndex = useMemo(() => {
    if (activeTime == null || decileCrossingsVisible.length === 0) return -1;
    if (targetLineX != null && Number.isFinite(targetLineX) && Math.abs(activeTime - targetLineX) < 1e-9) return -1;
    if (currentPTime != null && Number.isFinite(currentPTime) && Math.abs(activeTime - currentPTime) < 1e-9) return -1;
    let bestIdx = 0;
    let bestDist = Math.abs(decileCrossingsVisible[0]!.x - activeTime);
    for (let i = 1; i < decileCrossingsVisible.length; i++) {
      const d = Math.abs(decileCrossingsVisible[i]!.x - activeTime);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [activeTime, decileCrossingsVisible, targetLineX, currentPTime]);

  const yMax = useMemo(() => {
    if (smoothData.length === 0) return 5;
    const maxPct = smoothData.reduce((m, d) => Math.max(m, d.barPct ?? 0, d.smoothPct ?? 0), 0);
    const padded = maxPct * 1.25;
    const step = padded <= 5 ? 0.5 : padded <= 10 ? 1 : 2;
    return Math.ceil(padded / step) * step;
  }, [smoothData]);

  const empty = smoothData.length === 0;

  return (
    <Card className="overflow-hidden border border-[var(--ds-border-subtle)] shadow-none">
      <CardHeader className="border-b border-[var(--ds-border-subtle)] px-4 py-2.5">
        <CardTitle className="text-[length:var(--ds-text-sm)] font-semibold">Time Distribution</CardTitle>
        {!empty && isDebug && (
          <p className="mt-0.5 m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {timeSamples.length > 0
              ? `Monte Carlo (${iterationCount.toLocaleString()} iterations)`
              : "Derived from percentiles"}
          </p>
        )}
      </CardHeader>
      <CardContent
        className="flex w-full flex-col p-4"
        style={{ height: CHART_HEIGHT }}
      >
        {empty ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
            No data
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-muted)_22%,transparent)] text-[var(--ds-primary)]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartDataWithRagBand} margin={CHART_MARGIN}>
              <XAxis
                type="number"
                dataKey="time"
                domain={xDomain}
                scale="linear"
                allowDataOverflow
                padding={{ left: 0, right: 0 }}
                tick={false}
                tickLine={false}
                axisLine={{ stroke: "var(--ds-border-subtle)", strokeOpacity: 1 }}
              />
              <YAxis hide domain={[0, yMax]} />
              <Tooltip
                cursor={false}
                offset={5}
                contentStyle={{
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "none",
                  padding: 0,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) {
                    if (activeTimeTimeoutRef.current) clearTimeout(activeTimeTimeoutRef.current);
                    activeTimeTimeoutRef.current = setTimeout(() => setActiveTime(null), 0);
                    return null;
                  }
                  if (tooltipMarkers.length === 0) {
                    if (activeTimeTimeoutRef.current) clearTimeout(activeTimeTimeoutRef.current);
                    activeTimeTimeoutRef.current = setTimeout(() => setActiveTime(null), 0);
                    return null;
                  }
                  const time = Number(label);
                  const closest = tooltipMarkers.reduce(
                    (best, m) => (Math.abs(time - m.time) < Math.abs(time - best.time) ? m : best),
                    tooltipMarkers[0]!
                  );
                  const distToMarker = Math.abs(time - closest.time);
                  if (distToMarker > timeMarkerProximity) {
                    if (activeTimeTimeoutRef.current) clearTimeout(activeTimeTimeoutRef.current);
                    activeTimeTimeoutRef.current = setTimeout(() => setActiveTime(null), 0);
                    return null;
                  }
                  if (activeTimeTimeoutRef.current) clearTimeout(activeTimeTimeoutRef.current);
                  activeTimeTimeoutRef.current = setTimeout(() => setActiveTime(closest.time), 0);
                  return (
                    <div className="space-y-1.5 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-md)]">
                      <div className="font-semibold leading-tight text-[var(--ds-text-primary)]">{closest.pLabel}</div>
                      <div className="leading-snug text-[var(--ds-text-secondary)]">{formatDurationDays(closest.time)}</div>
                    </div>
                  );
                }}
              />
              <defs>
                <linearGradient id="simDistDepthTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity={0.02} />
                </linearGradient>
                {ragBand && (
                  <linearGradient id="timeChartRagFill" x1="0" y1="0" x2="1" y2="0">
                    {(() => {
                      const isGreen = ragBand.color === RAG_BAND_POSITIVE;
                      const darkerAtLeft = isGreen ? !ragBand.targetAtLeft : ragBand.targetAtLeft;
                      return darkerAtLeft ? (
                        <>
                          <stop offset="0%" stopColor={ragBand.color} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={ragBand.color} stopOpacity={0.08} />
                        </>
                      ) : (
                        <>
                          <stop offset="0%" stopColor={ragBand.color} stopOpacity={0.08} />
                          <stop offset="100%" stopColor={ragBand.color} stopOpacity={0.28} />
                        </>
                      );
                    })()}
                  </linearGradient>
                )}
              </defs>
              <Area
                type="natural"
                dataKey="smoothPct"
                stroke="var(--ds-primary)"
                strokeWidth={2.5}
                fill="url(#simDistDepthTime)"
                fillOpacity={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              {ragBand && (
                <Area
                  type="natural"
                  dataKey="ragBandPct"
                  stroke="none"
                  fill="url(#timeChartRagFill)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              )}
              {decileCrossingsVisible.map((c) => {
                const activeP =
                  activeTimeDotIndex >= 0 ? decileCrossingsVisible[activeTimeDotIndex]?.p : undefined;
                const isActive = activeP != null && c.p === activeP;
                return (
                  <ReferenceDot
                    key={c.p}
                    x={c.x}
                    y={c.y}
                    r={isActive ? 4.5 : 2.75}
                    fill="var(--ds-chart-annotation)"
                    stroke="var(--ds-surface-default)"
                    strokeWidth={1.25}
                  />
                );
              })}
              {currentScheduleCurvePoint && (
                <ReferenceDot
                  key="current-schedule"
                  x={currentScheduleCurvePoint.x}
                  y={currentScheduleCurvePoint.y}
                  r={
                    activeTime != null &&
                    currentPTime != null &&
                    Math.abs(activeTime - currentPTime) < 1e-9
                      ? 4.5
                      : 2.75
                  }
                  fill="color-mix(in oklab, var(--ds-chart-annotation) 72%, var(--ds-muted-foreground))"
                  stroke="var(--ds-surface-default)"
                  strokeWidth={1.25}
                />
              )}
              {targetLineX != null && Number.isFinite(targetLineX) && targetPLabel && (
                <ReferenceLine
                  segment={
                    targetLineCurveY != null
                      ? [{ x: targetLineX, y: 0 }, { x: targetLineX, y: targetLineCurveY }]
                      : undefined
                  }
                  x={targetLineCurveY == null ? targetLineX : undefined}
                  stroke={CHART_TARGET_STROKE}
                  strokeWidth={1.75}
                  strokeOpacity={1}
                  label={{
                    content: (p: LabelProps) => (
                      <RefLineLabelBottom
                        value={`Target (${targetPLabel})`}
                        fontWeight={500}
                        offsetX={deltaToTargetP != null && deltaToTargetP > 0 ? REF_LINE_LABEL_OFFSET_X : -REF_LINE_LABEL_OFFSET_X}
                        viewBox={p.viewBox}
                        x={p.x as number | undefined}
                        fill="var(--ds-text-secondary)"
                      />
                    ),
                  }}
                />
              )}
              {currentPTime != null && Number.isFinite(currentPTime) && currentPLabel && (
                currentScheduleCurvePoint ? (
                  <ReferenceLine
                    segment={[{ x: currentPTime, y: 0 }, { x: currentPTime, y: currentScheduleCurvePoint.y }]}
                    stroke="var(--ds-chart-annotation)"
                    strokeWidth={1.25}
                    strokeOpacity={0.62}
                    strokeDasharray="4 4"
                    label={{
                      content: (p: LabelProps) => (
                        <RefLineLabelBottom
                          value={currentPLabel ? `Current Schedule Position (${currentPLabel})` : "Current Schedule Position"}
                          fontWeight={500}
                          offsetX={deltaToTargetP != null && deltaToTargetP > 0 ? -REF_LINE_LABEL_OFFSET_X : REF_LINE_LABEL_OFFSET_X}
                          viewBox={p.viewBox}
                          x={p.x as number | undefined}
                          fill="var(--ds-text-muted)"
                        />
                      ),
                    }}
                  />
                ) : (
                  <ReferenceLine
                    x={currentPTime}
                    stroke="var(--ds-chart-annotation)"
                    strokeWidth={1.25}
                    strokeOpacity={0.62}
                    strokeDasharray="4 4"
                    label={{
                      content: (p: LabelProps) => (
                        <RefLineLabelBottom
                          value={currentPLabel ? `Current Schedule Position (${currentPLabel})` : "Current Schedule Position"}
                          fontWeight={500}
                          offsetX={deltaToTargetP != null && deltaToTargetP > 0 ? -REF_LINE_LABEL_OFFSET_X : REF_LINE_LABEL_OFFSET_X}
                          viewBox={p.viewBox}
                          x={p.x as number | undefined}
                          fill="var(--ds-text-muted)"
                        />
                      ),
                    }}
                  />
                )
              )}
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SimulationSection(props: SimulationSectionProps) {
  const {
    title,
    mode,
    baseline,
    results,
    isDebug,
    costCdf,
    timeCdf,
    tableSubtitle,
    formatCostValue,
    contingencyValueDollars,
    contingencyTimeDays,
    settingsHref,
  } = props;
  const { targetPNumeric, targetPLabel, approvedValue } = baseline;
  const formatCostDisplay = formatCostValue ?? formatCost;

  /**
   * First tile: cost = P at contingency $ when provided, else at approved budget.
   * Time = P at schedule contingency (delay days) when provided, else at planned duration fallback — both on the risk-delay / incremental cost CDF.
   */
  const currentPValue = useMemo(() => {
    if (mode === "cost" && costCdf?.length) {
      const costValue = contingencyValueDollars != null && Number.isFinite(contingencyValueDollars)
        ? contingencyValueDollars
        : approvedValue;
      if (costValue <= 0) return null;
      const p = percentileAtCost(costCdf, costValue);
      return p != null ? Math.round(p) : null;
    }
    if (mode === "time" && timeCdf?.length) {
      const refDays =
        contingencyTimeDays != null && Number.isFinite(contingencyTimeDays)
          ? contingencyTimeDays
          : approvedValue;
      if (refDays <= 0) return null;
      const p = percentileAtTime(timeCdf, refDays);
      return p != null ? Math.round(p) : null;
    }
    return null;
  }, [mode, costCdf, timeCdf, approvedValue, contingencyValueDollars, contingencyTimeDays]);

  /** Cost ($) or time (days) at the target P percentile. */
  const valueAtTargetP = useMemo(() => {
    if (mode === "cost" && costCdf?.length) {
      return costAtPercentile(costCdf, targetPNumeric);
    }
    if (mode === "time" && timeCdf?.length) {
      return timeAtPercentile(timeCdf, targetPNumeric);
    }
    return null;
  }, [mode, costCdf, timeCdf, targetPNumeric]);

  /**
   * Cost: (cost at target P) − contingency $.
   * Time: (risk delay days at target P) − schedule contingency days. Same units as simulation outputs.
   */
  const deltaToTargetP = useMemo(() => {
    if (valueAtTargetP == null) return null;
    if (mode === "cost") {
      if (contingencyValueDollars == null || !Number.isFinite(contingencyValueDollars)) return null;
      return valueAtTargetP - contingencyValueDollars;
    }
    if (mode === "time") {
      if (contingencyTimeDays == null || !Number.isFinite(contingencyTimeDays)) return null;
      return valueAtTargetP - contingencyTimeDays;
    }
    return null;
  }, [mode, valueAtTargetP, contingencyValueDollars, contingencyTimeDays]);

  /** Cost at current P (for vertical line on cost chart). */
  const costAtCurrentP = useMemo(() => {
    if (mode !== "cost" || currentPValue == null || !costCdf?.length) return null;
    return costAtPercentile(costCdf, currentPValue);
  }, [mode, currentPValue, costCdf]);

  /** Risk delay (days) at current P (for vertical line on time chart; mirrors costAtCurrentP). */
  const timeAtCurrentP = useMemo(() => {
    if (mode !== "time" || currentPValue == null || !timeCdf?.length) return null;
    return timeAtPercentile(timeCdf, currentPValue);
  }, [mode, currentPValue, timeCdf]);

  const costResults = mode === "cost" ? (results as CostResults) : null;
  const timeResults = mode === "time" ? (results as TimeResults) : null;

  const topRisks = useMemo(() => {
    const r = mode === "cost" ? costResults : timeResults;
    if (!r?.risks?.length) return [];
    if (mode === "cost") {
      return [...r.risks]
        .sort((a, b) => (b.simMeanCost ?? b.expectedCost) - (a.simMeanCost ?? a.expectedCost))
        .slice(0, SIMULATION_TOP_RISKS_COUNT);
    }
    return [...r.risks]
      .sort((a, b) => (b.simMeanDays ?? b.expectedDays) - (a.simMeanDays ?? a.expectedDays))
      .slice(0, SIMULATION_TOP_RISKS_COUNT);
  }, [mode, costResults, timeResults]);

  const tableLabel = mode === "cost" ? "Top 5 Cost Risks" : "Top 5 Time Risks";
  const tableLabelDisplay = tableSubtitle ? `${tableLabel} (${tableSubtitle})` : tableLabel;

  return (
    <Card
      variant="inset"
      className="overflow-hidden text-[var(--ds-text-secondary)] transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_140%,var(--ds-text-muted))]"
    >
      <CardHeader className="border-b border-[var(--ds-border-subtle)] px-4 py-3">
        <CardTitle className="text-[length:var(--ds-text-base)]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
          <Card className="flex min-h-[8.5rem] flex-col transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_140%,var(--ds-text-muted))]">
            <CardContent className="flex flex-1 flex-col p-4">
            <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
              {mode === "cost" ? "Current Funding Confidence" : "Current P-Value (Time)"}
            </div>
            <div className="mt-1 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
              {currentPValue != null ? `P${currentPValue}` : "—"}
            </div>
            {mode === "cost" && (
              <div className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
                {contingencyValueDollars != null ? "Likelihood of delivery within current funding" : "Confidence at approved budget"}
              </div>
            )}
            {mode === "time" && (
              <div className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
                {contingencyTimeDays != null && Number.isFinite(contingencyTimeDays)
                  ? "Confidence within schedule contingency (risk delay)"
                  : "Planned duration as reference (chart is risk delay, not programme length)"}
              </div>
            )}
            </CardContent>
          </Card>
          <Card className="flex min-h-[8.5rem] flex-col transition-colors hover:border-[color-mix(in_oklab,var(--ds-border)_140%,var(--ds-text-muted))]">
            <CardContent className="flex flex-1 flex-col p-4">
            <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
              Funding Position vs Target{mode === "cost" ? "" : " (Time)"}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
                {deltaToTargetP != null
                  ? mode === "cost"
                    ? formatCostDisplay(Math.abs(deltaToTargetP))
                    : formatDurationDays(Math.abs(deltaToTargetP))
                  : "—"}
              </span>
              {deltaToTargetP != null && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--ds-border)]"
                  title={deltaToTargetP > 0 ? "Shortfall" : deltaToTargetP < 0 ? "Headroom" : "On target"}
                  style={{
                    backgroundColor:
                      deltaToTargetP > 0
                        ? "var(--ds-chart-insight-negative)"
                        : deltaToTargetP < 0
                          ? "var(--ds-chart-insight-positive)"
                          : "var(--ds-warning)",
                  }}
                  aria-hidden
                />
              )}
            </div>
            {mode === "cost" &&
            ((contingencyValueDollars != null && deltaToTargetP != null) ||
              (contingencyValueDollars != null && isDebug) ||
              (contingencyValueDollars == null && isDebug)) ? (
              <div className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
                {contingencyValueDollars != null && deltaToTargetP != null ? (
                  deltaToTargetP > 0
                    ? `Below ${targetPLabel} Target`
                    : deltaToTargetP < 0
                      ? `Target ${targetPLabel} achieved`
                      : `Target ${targetPLabel} achieved`
                ) : contingencyValueDollars != null && isDebug ? (
                  <>
                    Contingency adjustment to achieve{" "}
                    <Link href={settingsHref ?? riskaiPath("/projects")} className="text-[var(--ds-text-secondary)] underline hover:text-[var(--ds-text-primary)]">
                      Target P-Value ({targetPLabel})
                    </Link>
                  </>
                ) : (
                  "Confidence at approved budget"
                )}
              </div>
            ) : null}
            {mode === "time" &&
            ((contingencyTimeDays != null && deltaToTargetP != null) ||
              (contingencyTimeDays != null && isDebug) ||
              (contingencyTimeDays == null && isDebug)) ? (
              <div className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
                {contingencyTimeDays != null && deltaToTargetP != null ? (
                  deltaToTargetP > 0
                    ? `Below ${targetPLabel} Target`
                    : deltaToTargetP < 0
                      ? `Target ${targetPLabel} achieved`
                      : `Target ${targetPLabel} achieved`
                ) : contingencyTimeDays != null && isDebug ? (
                  <>
                    Schedule contingency vs{" "}
                    <Link href={settingsHref ?? riskaiPath("/projects")} className="text-[var(--ds-text-secondary)] underline hover:text-[var(--ds-text-primary)]">
                      Target P-Value ({targetPLabel})
                    </Link>
                  </>
                ) : (
                  "Set schedule contingency in project settings to compare delay at target P"
                )}
              </div>
            ) : null}
            </CardContent>
          </Card>
        </div>

        {mode === "cost" && costResults && (
          <CostChart
            results={costResults}
            targetPNumeric={targetPNumeric}
            targetPLabel={targetPLabel}
            isDebug={isDebug}
            currentPCost={costAtCurrentP}
            currentPLabel={currentPValue != null ? `P${currentPValue}` : null}
            deltaToTargetP={deltaToTargetP}
          />
        )}
        {mode === "time" && timeResults && (
          <TimeChart
            results={timeResults}
            targetPNumeric={targetPNumeric}
            targetPLabel={targetPLabel}
            isDebug={isDebug}
            currentPTime={timeAtCurrentP}
            currentPLabel={currentPValue != null ? `P${currentPValue}` : null}
            deltaToTargetP={deltaToTargetP}
          />
        )}

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--ds-border)] px-4 py-2">
            <h3 className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">{tableLabelDisplay}</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="py-2 pl-3 pr-3 text-left normal-case tracking-normal">#</TableHeaderCell>
                  <TableHeaderCell className="py-2 pl-3 pr-3 text-left normal-case tracking-normal">Risk</TableHeaderCell>
                  {mode === "cost" ? (
                    <TableHeaderCell className="py-2 pl-3 pr-3 text-right normal-case tracking-normal">Cost impact</TableHeaderCell>
                  ) : (
                    <TableHeaderCell className="py-2 pl-3 pr-3 text-right normal-case tracking-normal">Time impact (days)</TableHeaderCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {topRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-4 text-center text-[var(--ds-text-muted)]">
                      No risks in simulation
                    </TableCell>
                  </TableRow>
                ) : (
                  topRisks.map((risk, i) => (
                    <TableRow
                      key={risk.id}
                      className="hover:bg-[color-mix(in_oklab,var(--ds-muted)_35%,transparent)]"
                    >
                      <TableCell className="py-2.5 pl-3 pr-3 text-[var(--ds-text-muted)]">{i + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate py-2.5 pl-3 pr-3 text-[var(--ds-text-primary)]" title={risk.title}>
                        {risk.title}
                      </TableCell>
                      {mode === "cost" ? (
                        <TableCell className="py-2.5 pl-3 pr-3 text-right font-medium">
                          {formatCostDisplay(risk.simMeanCost ?? risk.expectedCost)}
                        </TableCell>
                      ) : (
                        <TableCell className="py-2.5 pl-3 pr-3 text-right font-medium">
                          {formatDurationDays(risk.simMeanDays ?? risk.expectedDays)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </CardContent>
    </Card>
  );
}
