"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Callout, Card, CardBody, CardHeader, CardTitle } from "@visualify/design-system";
import { LoadingPlaceholder } from "@/components/ds/LoadingPlaceholder";
import type { Risk } from "@/domain/risk/risk.schema";
import type { SimulationSnapshot } from "@/domain/simulation/simulation.types";

type RankedRow = {
  riskId: string;
  riskName: string;
  bestROIBand: { from: number; to: number };
  bestROIBandBenefit?: number;
  topBandBenefitPerDollar: number;
  explanation: string;
};

type ApiResult = {
  baseline: { neutralTargetCost: number; neutralTargetDays: number; targetPercent: number };
  ranked: RankedRow[]; // backward compatibility
  rankedCost?: RankedRow[];
  rankedSchedule?: RankedRow[];
  meta?: { spendStepsUsed?: number[]; metricUsed?: string };
};

const DEFAULT_BODY = {
  spendSteps: [0, 25_000, 50_000, 100_000, 200_000],
  benefitMetric: "targetCostReduction" as const,
};

function formatCost(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBand(band: { from: number; to: number }): string {
  return `${formatCost(band.from)} – ${formatCost(band.to)}`;
}

type MitigationOptimisationPanelProps = {
  risks: Risk[];
  neutralSnapshot: SimulationSnapshot | null;
  targetPercent: number;
  targetScheduleDays: number | null;
};

export function MitigationOptimisationPanel({ risks, neutralSnapshot, targetPercent, targetScheduleDays }: MitigationOptimisationPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure server-side simulation context is fresh before requesting optimisation.
      await fetch("/api/simulation-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risks, neutralSnapshot }),
      }).catch(() => {});

      const res = await fetch("/api/mitigation-optimisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...DEFAULT_BODY, risks, neutralSnapshot, targetPercent, targetScheduleDays }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
        setData(null);
        return;
      }
      if (json && typeof json.baseline === "object" && Array.isArray(json.ranked)) {
        setData(json as ApiResult);
      } else {
        setError("Invalid response shape");
        setData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [risks, neutralSnapshot, targetPercent, targetScheduleDays]);

  // Wait for store sync (300ms debounce) to complete before first fetch so API sees current context.
  useEffect(() => {
    const t = setTimeout(() => {
      fetchData();
    }, 400);
    return () => clearTimeout(t);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <Card className="mt-6 overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-[length:var(--ds-text-base)]">Project target P-value improvement per $</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <LoadingPlaceholder label="Loading mitigation leverage" />
        </CardBody>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="mt-6 overflow-hidden">
        <CardHeader className="py-3">
          <CardTitle className="text-[length:var(--ds-text-base)]">Project target P-value improvement per $</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 pt-0">
          <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
            {error}
          </Callout>
          <Button type="button" variant="secondary" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!data) return null;
  const rankedCost = data.rankedCost ?? data.ranked ?? [];
  const rankedSchedule = data.rankedSchedule ?? [];

  return (
    <section className="mt-6 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/50 overflow-hidden">
      <h2 className="text-base font-semibold text-[var(--ds-text-primary)] px-4 py-3 border-b border-[var(--ds-border)] m-0">
        Project target P-value improvement per $
      </h2>
      <div className="p-4">
        <p className="text-xs text-[var(--ds-text-muted)] mb-3">
          Baseline = Monte Carlo neutral target percentile cost (same run as Cost Distribution). Benefit is projected from a parametric model, not from a second simulation. Ranking by leverage score (benefit per $ × materiality weight).
        </p>
        <div className="mb-4">
          <span className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">Baseline (Neutral) target cost ({`P${Math.round(data.baseline.targetPercent)}`})</span>
          <div className="mt-0.5 text-lg font-semibold text-[var(--ds-text-primary)]">
            {formatCost(data.baseline.neutralTargetCost)}
          </div>
        </div>
        <div className="mb-4">
          <span className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">Baseline (Neutral) target schedule ({`P${Math.round(data.baseline.targetPercent)}`})</span>
          <div className="mt-0.5 text-lg font-semibold text-[var(--ds-text-primary)]">
            {`${Math.round(data.baseline.neutralTargetDays).toLocaleString()} working days`}
          </div>
        </div>
        <p className="text-xs text-[var(--ds-text-muted)] mb-2">
          ROI metric is dimension-aware: Cost table uses cost reduced per dollar; Schedule table uses working days reduced per dollar. Best ROI band may differ from the first spend band.
        </p>
        <div className="text-xs font-medium text-[var(--ds-text-secondary)] mb-1">Cost leverage</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <colgroup>
              <col style={{ width: "48px" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--ds-border)]">
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">#</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Risk</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Best ROI band</th>
                <th className="text-right py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Cost reduced per $</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {rankedCost.map((row, i) => (
                <tr key={row.riskId} className="border-b border-[var(--ds-border-subtle)]">
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">{i + 1}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-primary)]">{row.riskName}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">{formatBand(row.bestROIBand)}</td>
                  <td className="py-2 px-2 text-right font-medium text-[var(--ds-text-primary)]">
                    {row.topBandBenefitPerDollar.toFixed(4)}
                  </td>
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)] max-w-xs truncate" title={row.explanation}>
                    {row.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs font-medium text-[var(--ds-text-secondary)] mt-4 mb-1">Schedule leverage</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <colgroup>
              <col style={{ width: "48px" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--ds-border)]">
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">#</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Risk</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Best improvement (working days)</th>
                <th className="text-right py-2 px-2 font-medium text-[var(--ds-text-secondary)]">$ per working day reduced</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {rankedSchedule.map((row, i) => (
                <tr key={`sch-${row.riskId}`} className="border-b border-[var(--ds-border-subtle)]">
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">{i + 1}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-primary)]">{row.riskName}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">
                    {typeof row.bestROIBandBenefit === "number" && Number.isFinite(row.bestROIBandBenefit)
                      ? `${row.bestROIBandBenefit.toFixed(2)} working days`
                      : "—"}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-[var(--ds-text-primary)]">
                    {row.topBandBenefitPerDollar > 0
                      ? (1 / row.topBandBenefitPerDollar).toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </td>
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)] max-w-xs truncate" title={row.explanation}>
                    {row.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
