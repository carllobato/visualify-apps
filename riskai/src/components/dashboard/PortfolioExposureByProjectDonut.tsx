"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type {
  PortfolioProjectCostExposureSlice,
  PortfolioProjectScheduleExposureSlice,
} from "@/lib/dashboard/projectTileServerData";
import { formatDurationDaysRoundedWhole } from "@/lib/formatDuration";
import {
  formatCurrencyInReportingUnit,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import { riskaiPath } from "@/lib/routes";

const SERIES_COLORS = [
  "var(--ds-chart-series-1)",
  "var(--ds-chart-series-2)",
  "var(--ds-chart-series-3)",
  "var(--ds-chart-series-4)",
  "var(--ds-chart-series-5)",
  "var(--ds-chart-series-6)",
];

type CostDatum = {
  name: string;
  value: number;
  projectId: string;
  currency: PortfolioProjectCostExposureSlice["currency"];
  kind: "cost";
};

type ScheduleDatum = {
  name: string;
  value: number;
  projectId: string;
  kind: "schedule";
};

type ChartDatum = CostDatum | ScheduleDatum;

export type PortfolioExposureByProjectDonutProps =
  | { mode: "cost"; slices: PortfolioProjectCostExposureSlice[]; reportingUnit: ReportingUnitOption }
  | { mode: "schedule"; slices: PortfolioProjectScheduleExposureSlice[] };

function PortfolioExposureByProjectDonutImpl(props: PortfolioExposureByProjectDonutProps) {
  const router = useRouter();

  const { data, total, multiCurrency, singleCurrency } = useMemo(() => {
    if (props.mode === "cost") {
      const rows: CostDatum[] = props.slices.map((s) => ({
        name: s.projectName,
        value: s.value,
        currency: s.currency,
        projectId: s.projectId,
        kind: "cost" as const,
      }));
      const t = rows.reduce((a, r) => a + r.value, 0);
      const cur = new Set(props.slices.map((s) => s.currency));
      const sc = cur.size === 1 ? (props.slices[0]?.currency ?? null) : null;
      return { data: rows as ChartDatum[], total: t, multiCurrency: cur.size > 1, singleCurrency: sc };
    }
    const rows: ScheduleDatum[] = props.slices.map((s) => ({
      name: s.projectName,
      value: s.valueDays,
      projectId: s.projectId,
      kind: "schedule" as const,
    }));
    const t = rows.reduce((a, r) => a + r.value, 0);
    return { data: rows as ChartDatum[], total: t, multiCurrency: false, singleCurrency: null };
  }, [props]);

  const centerLabel = useMemo(() => {
    if (props.mode === "schedule") return formatDurationDaysRoundedWhole(total);
    if (singleCurrency) return formatCurrencyInReportingUnit(total, singleCurrency, props.reportingUnit);
    return null;
  }, [props, total, singleCurrency]);

  if (data.length === 0 || total <= 0) {
    return (
      <p className="text-sm text-[var(--ds-text-muted)] m-0">
        {props.mode === "cost"
          ? "No cost exposure data to chart. Add cost-applicable risks with positive impacts across projects to see distribution."
          : "No schedule exposure data to chart. Add time-applicable risks with positive schedule impacts across projects to see distribution."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[200px] w-full min-w-0 lg:h-[168px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="80%"
              paddingAngle={2}
              cornerRadius={4}
              onClick={(_sector, index) => {
                const row = data[index];
                if (row) router.push(riskaiPath(`/projects/${row.projectId}`));
              }}
              className="cursor-pointer outline-none [&_path]:focus-visible:ring-2 [&_path]:focus-visible:ring-[var(--ds-primary)]"
              label={centerLabel ? ({ cx, cy, index }) => {
                if (index !== 0) return null;
                // Use foreignObject so long labels (e.g. "18.3 weeks", compact currency) are not clipped by SVG <text> in the donut hole.
                const w = 168;
                const h = 40;
                return (
                  <foreignObject
                    x={cx - w / 2}
                    y={cy - h / 2}
                    width={w}
                    height={h}
                    style={{ overflow: "visible", pointerEvents: "none" }}
                  >
                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[length:var(--ds-text-xs)] font-semibold leading-tight text-[var(--ds-text-primary)]">
                      {centerLabel}
                    </div>
                  </foreignObject>
                );
              } : undefined}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                  stroke="var(--ds-border-subtle)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as ChartDatum;
                const pct = total > 0 ? (row.value / total) * 100 : 0;
                const amountLabel =
                  row.kind === "cost"
                    ? formatCurrencyInReportingUnit(row.value, row.currency, props.reportingUnit)
                    : formatDurationDaysRoundedWhole(row.value);
                return (
                  <div className="max-w-[16rem] rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-2.5 py-2 text-[length:var(--ds-text-xs)] shadow-[var(--ds-shadow-md)]">
                    <p className="m-0 font-semibold text-[var(--ds-text-primary)] truncate" title={row.name}>
                      {row.name}
                    </p>
                    <p className="m-0 mt-1 tabular-nums text-[var(--ds-text-secondary)]">
                      {amountLabel} <span className="text-[var(--ds-text-muted)]">({pct.toFixed(1)}%)</span>
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {props.mode === "cost" && multiCurrency ? (
        <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-muted)]">
          Projects use different currencies; slice sizes sum engine totals as numbers—use tooltips for amounts in each
          project&apos;s currency.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Memoized so unrelated portfolio UI state (e.g. “Risks by category” expand) does not re-render
 * Recharts and replay the pie entrance animation.
 */
export const PortfolioExposureByProjectDonut = memo(
  PortfolioExposureByProjectDonutImpl,
  (prev, next) => prev.mode === next.mode && prev.slices === next.slices
);
