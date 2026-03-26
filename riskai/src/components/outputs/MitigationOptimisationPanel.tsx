"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Callout, Card, CardBody, CardHeader, CardTitle } from "@visualify/design-system";
import { LoadingPlaceholder } from "@/components/ds/LoadingPlaceholder";

type RankedRow = {
  riskId: string;
  riskName: string;
  bestROIBand: { from: number; to: number };
  topBandBenefitPerDollar: number;
  explanation: string;
};

type ApiResult = {
  baseline: { neutralP80: number };
  ranked: RankedRow[];
  meta?: { spendStepsUsed?: number[]; metricUsed?: string };
};

const DEFAULT_BODY = {
  spendSteps: [0, 25_000, 50_000, 100_000, 200_000],
  benefitMetric: "p80CostReduction" as const,
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

export function MitigationOptimisationPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mitigation-optimisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_BODY),
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
  }, []);

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
          <CardTitle className="text-[length:var(--ds-text-base)]">Project P80 improvement per $</CardTitle>
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
          <CardTitle className="text-[length:var(--ds-text-base)]">Project P80 improvement per $</CardTitle>
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

  return (
    <section className="mt-6 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/50 overflow-hidden">
      <h2 className="text-base font-semibold text-[var(--ds-text-primary)] px-4 py-3 border-b border-[var(--ds-border)] m-0">
        Project P80 improvement per $
      </h2>
      <div className="p-4">
        <p className="text-xs text-[var(--ds-text-muted)] mb-3">
          Baseline = Monte Carlo neutral P80 cost (same run as Cost Distribution). Benefit is projected from a parametric model, not from a second simulation. Ranking by leverage score (benefit per $ × materiality weight).
        </p>
        <div className="mb-4">
          <span className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">Baseline (Neutral) P80 cost</span>
          <div className="mt-0.5 text-lg font-semibold text-[var(--ds-text-primary)]">
            {formatCost(data.baseline.neutralP80)}
          </div>
        </div>
        <p className="text-xs text-[var(--ds-text-muted)] mb-2">
          Benefit per $ = first spend band’s marginal benefit ÷ incremental spend. Best ROI band may be a different band (max benefit per $).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--ds-border)]">
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">#</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Risk</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Best ROI band</th>
                <th className="text-right py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Benefit per $</th>
                <th className="text-left py-2 px-2 font-medium text-[var(--ds-text-secondary)]">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {data.ranked.map((row, i) => (
                <tr key={row.riskId} className="border-b border-[var(--ds-border-subtle)]">
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">{i + 1}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-primary)]">{row.riskName}</td>
                  <td className="py-2 px-2 text-[var(--ds-text-secondary)]">{formatBand(row.bestROIBand)}</td>
                  <td className="py-2 px-2 text-right font-medium text-[var(--ds-text-primary)]">
                    {row.topBandBenefitPerDollar.toFixed(2)}
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
