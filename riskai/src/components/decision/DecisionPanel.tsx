"use client";

import { useMemo, useState } from "react";
import { useRiskRegister } from "@/store/risk-register.store";
import {
  selectPortfolioDecisionSummary,
  selectTopCriticalRisks,
  selectDecisionByRiskId,
  selectRankedRisks,
  selectDecisionScoreDelta,
  SCORE_DELTA_SHOW_THRESHOLD,
} from "@/store/selectors";
import { selectLatestSnapshotRiskIntelligence } from "@/lib/simulationSelectors";
import { getScoreBand } from "@/lib/decisionScoreBand";
import { getForwardSignals } from "@/lib/forwardSignals";
import { calculateInstabilityDrivers } from "@/lib/instability/portfolioDrivers";
import { getBand } from "@/config/riskThresholds";
import type { RankedRiskRow } from "@/store/selectors";
import type { AlertTag } from "@/domain/decision/decision.types";

type DecisionSort = "score" | "instability" | "velocity" | "volatility";

const SORT_OPTIONS: { value: DecisionSort; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "instability", label: "Instability" },
  { value: "velocity", label: "Velocity" },
  { value: "volatility", label: "Volatility" },
];

const ALERT_TAG_CLASS: Record<AlertTag, string> = {
  CRITICAL: "bg-[var(--ds-risk-critical-bg)] text-[var(--ds-risk-critical-fg)]",
  ACCELERATING: "bg-[var(--ds-risk-medium-bg)] text-[var(--ds-risk-medium-fg)]",
  VOLATILE: "bg-[var(--ds-risk-volatile-bg)] text-[var(--ds-risk-volatile-fg)]",
  UNSTABLE: "bg-[var(--ds-risk-medium-bg)] text-[var(--ds-risk-medium-fg)]",
  EMERGING: "bg-[var(--ds-risk-emerging-bg)] text-[var(--ds-risk-emerging-fg)]",
  IMPROVING: "bg-[var(--ds-risk-low-bg)] text-[var(--ds-risk-low-fg)]",
};

function scoreBadgeClass(score: number): string {
  const band = getScoreBand(score);
  if (band === "critical") return "bg-[var(--ds-risk-critical-bg)] text-[var(--ds-risk-critical-fg)]";
  if (band === "watch") return "bg-[var(--ds-risk-medium-bg)] text-[var(--ds-risk-medium-fg)]";
  return "bg-[var(--ds-status-neutral-subtle-bg)] text-[var(--ds-status-neutral-subtle-fg)]";
}

export function DecisionPanel() {
  const { risks, simulation, riskForecastsById, forwardPressure } = useRiskRegister();
  const [sortBy, setSortBy] = useState<DecisionSort>("score");

  const state = useMemo(() => ({ simulation }), [simulation]);
  const summary = useMemo(() => selectPortfolioDecisionSummary(state), [state]);
  const decisionById = useMemo(() => selectDecisionByRiskId(state), [state]);
  const scoreDeltaByRiskId = useMemo(() => selectDecisionScoreDelta(state), [state]);
  const ranked = useMemo(() => selectRankedRisks(state), [state]);
  // Intentionally computed per render; simulation.current is mutable so we avoid useMemo to prevent incorrect deps.
  const intelRows = selectLatestSnapshotRiskIntelligence(simulation.current, simulation.history ?? []);

  const intelByRiskId = useMemo(() => {
    const map = new Map<string, { velocity: number; volatility: number; stability: number }>();
    for (const row of intelRows) {
      map.set(row.id, {
        velocity: row.velocity,
        volatility: row.volatility,
        stability: row.stability,
      });
    }
    return map;
  }, [intelRows]);

  const sortedTop10 = useMemo(() => {
    const merged: (RankedRiskRow & { velocity: number; volatility: number; stability: number })[] = ranked.map(
      (r) => {
        const intel = intelByRiskId.get(r.riskId) ?? { velocity: 0, volatility: 0, stability: 100 };
        return { ...r, ...intel };
      }
    );
    if (sortBy === "score") return merged.slice(0, 10);
    if (sortBy === "instability") return [...merged].sort((a, b) => a.stability - b.stability).slice(0, 10);
    if (sortBy === "velocity") return [...merged].sort((a, b) => b.velocity - a.velocity).slice(0, 10);
    if (sortBy === "volatility") return [...merged].sort((a, b) => b.volatility - a.volatility).slice(0, 10);
    return merged.slice(0, 10);
  }, [ranked, intelByRiskId, sortBy]);

  const displayList = sortedTop10.length > 0 ? sortedTop10 : selectTopCriticalRisks(10)(state);

  const eiiSummary = useMemo(() => {
    const withEii = Object.entries(riskForecastsById)
      .filter(([, f]) => f?.instability != null)
      .map(([riskId, f]) => ({ riskId, index: f!.instability!.index }));
    if (withEii.length === 0) {
      return { avgEii: 0, highCount: 0, criticalCount: 0, top3: [] };
    }
    const sum = withEii.reduce((s, x) => s + x.index, 0);
    const avgEii = Math.round(sum / withEii.length);
    const highCount = withEii.filter((x) => x.index >= 50).length;
    const criticalCount = withEii.filter((x) => x.index >= 75).length;
    const top3 = [...withEii]
      .sort((a, b) => b.index - a.index)
      .slice(0, 3)
      .map(({ riskId, index }) => ({
        riskId,
        title: risks.find((r) => r.id === riskId)?.title ?? "—",
        index,
      }));
    return { avgEii, highCount, criticalCount, top3 };
  }, [riskForecastsById, risks]);

  const instabilityDrivers = useMemo(() => {
    const risksWithInstability = risks
      .map((r) => {
        const f = riskForecastsById[r.id];
        if (!f?.instability) return null;
        return { id: r.id, title: r.title, instability: f.instability };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
    return calculateInstabilityDrivers(risksWithInstability);
  }, [risks, riskForecastsById]);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_52%,var(--ds-surface-default))]">
      <div className="p-4 border-b border-[var(--ds-border)]">
        <h2 className="m-0 text-lg font-semibold text-[var(--ds-text-primary)]">Decision</h2>
        <p className="m-0 mt-1 text-sm text-[var(--ds-text-muted)]">
          Decision-grade ranking from behavioural metrics.
        </p>
        <p className="m-0 mt-1.5 text-xs text-[var(--ds-text-muted)]" title="Neutral baseline projection.">
          Forecast Model: Neutral Baseline
        </p>
        <p className="m-0 mt-0.5 text-xs text-[var(--ds-text-muted)]">
          Forecast Confidence: Based on history depth, momentum stability, and volatility.
        </p>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Total Risks
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.totalRisks}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Critical
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.criticalCount}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Accelerating
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.acceleratingCount}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Volatile
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.volatileCount}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Unstable
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.unstableCount}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Emerging
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.emergingCount}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Avg Score
          </div>
          <div className="mt-0.5 text-lg font-semibold">{summary.avgCompositeScore.toFixed(1)}</div>
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            Projected critical (5 cycles)
          </div>
          <div className="mt-0.5 text-lg font-semibold">{forwardPressure.projectedCriticalCount}</div>
          {forwardPressure.mitigationInsufficientCount > 0 && (
            <div className="mt-0.5 text-xs text-[var(--ds-text-muted)]">
              +{forwardPressure.mitigationInsufficientCount} mitigation insufficient
            </div>
          )}
        </div>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide">
            EII Summary
          </div>
          <div className="mt-0.5 text-lg font-semibold">{eiiSummary.avgEii}</div>
          <div className="mt-0.5 text-xs text-[var(--ds-text-muted)]">
            # High (≥50): {eiiSummary.highCount} · # Critical (≥75): {eiiSummary.criticalCount}
          </div>
          {eiiSummary.top3.length > 0 && (
            <div className="mt-2 text-xs text-[var(--ds-text-secondary)]">
              <div className="mb-1 font-medium text-[var(--ds-text-secondary)]">Top 3 unstable</div>
              <ul className="list-none p-0 m-0 space-y-0.5">
                {eiiSummary.top3.map(({ riskId, title, index }) => (
                  <li key={riskId} className="truncate" title={title}>
                    {title || "—"} (EII {index})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-4">
          <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide mb-3">
            Instability Drivers
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-[var(--ds-text-secondary)] sm:grid-cols-4">
            <div>High Volatility: {instabilityDrivers.highVolatilityCount} risks</div>
            <div>Low Confidence: {instabilityDrivers.lowConfidenceCount} risks</div>
            <div>High Scenario Spread: {instabilityDrivers.highSensitivityCount} risks</div>
            <div>High Velocity: {instabilityDrivers.highVelocityCount} risks</div>
          </div>
          {instabilityDrivers.topContributors.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--ds-border)]">
              <div className="text-xs font-medium text-[var(--ds-text-muted)] uppercase tracking-wide mb-2">
                Top Contributors
              </div>
              <ul className="m-0 list-none space-y-1.5 p-0 text-sm text-[var(--ds-text-secondary)]">
                {instabilityDrivers.topContributors.map(({ riskId, title, eii, level }) => (
                  <li key={riskId} className="truncate flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate min-w-0" title={title}>{title}</span>
                    <span className="shrink-0 text-[var(--ds-text-muted)]">EII {eii}</span>
                    <span className="shrink-0 text-xs font-medium text-[var(--ds-text-secondary)]">{level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--ds-text-secondary)]">Sort:</span>
        <div
          className="inline-flex rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-0.5"
          role="group"
          aria-label="Decision list sort"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sortBy === opt.value
                  ? "bg-[var(--ds-surface-hover)] text-[var(--ds-text-primary)] shadow-sm ring-1 ring-[var(--ds-border)] dark:bg-[var(--ds-surface-inset)] dark:text-[var(--ds-text-primary)] dark:ring-[var(--ds-border)]"
                  : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-[var(--ds-text-muted)] mb-2">
          Sorted by {sortBy === "score" ? "Score" : sortBy === "instability" ? "Instability" : sortBy === "velocity" ? "Velocity" : "Volatility"} (desc)
        </p>
        <h3 className="mb-2 text-sm font-medium text-[var(--ds-text-secondary)]">Top Critical Risks</h3>
        {displayList.length === 0 ? (
          <p className="text-sm text-[var(--ds-text-muted)]">No risks. Run a simulation.</p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-2">
            {displayList.map((row, index) => {
              const tags = decisionById[row.riskId]?.alertTags ?? [];
              const showTags = tags.slice(0, 2);
              const extra = tags.length > 2 ? tags.length - 2 : 0;
              const delta = scoreDeltaByRiskId[row.riskId];
              const showUp = typeof delta === "number" && delta > SCORE_DELTA_SHOW_THRESHOLD;
              const showDown = typeof delta === "number" && delta < -SCORE_DELTA_SHOW_THRESHOLD;
              const forecast = riskForecastsById[row.riskId];
              const signals = getForwardSignals(row.riskId, riskForecastsById);
              const showConfidence = index < 3 && forecast != null && typeof forecast.forecastConfidence === "number";
              const confScore = forecast?.forecastConfidence;
              const confBand = forecast?.confidenceBand ?? (typeof confScore === "number" ? (confScore < 40 ? "low" : confScore < 70 ? "medium" : "high") : null);
              const currentBand = getBand(row.compositeScore);
              const isCritical = currentBand === "critical";
              const showProjectedUp = signals.hasForecast && signals.projectedCritical && !isCritical;
              const cyclesText = signals.hasForecast && (signals.timeToCritical != null || isCritical)
                ? (isCritical ? "0 cycles" : `in ${signals.timeToCritical} cycles`)
                : null;
              const mitigationLabel = signals.hasForecast && signals.mitigationInsufficient
                ? (isCritical ? "Remains critical" : "Mitigation insufficient")
                : null;
              return (
                <li
                  key={row.riskId}
                  className="flex flex-wrap items-center gap-2 py-2 px-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--ds-text-primary)]">
                    {row.title || "—"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-medium shrink-0 ${scoreBadgeClass(
                      row.compositeScore
                    )}`}
                  >
                    {Math.round(row.compositeScore)}
                    {showUp && <span className="opacity-90">↑</span>}
                    {showDown && <span className="opacity-90">↓</span>}
                  </span>
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {showProjectedUp && (
                      <span
                        className="inline-flex rounded px-1.5 py-0.5 text-xs font-medium bg-[var(--ds-status-neutral-subtle-bg)] text-[var(--ds-status-neutral-subtle-fg)]"
                        title={cyclesText ?? undefined}
                      >
                        Projected ↑
                      </span>
                    )}
                    {cyclesText != null && (
                      <span className="text-xs text-[var(--ds-text-muted)]" title={isCritical ? "Already critical" : `Reaches critical in ${signals.timeToCritical} cycles`}>
                        {cyclesText}
                      </span>
                    )}
                    {mitigationLabel != null && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-[var(--ds-risk-medium-bg)] text-[var(--ds-risk-medium-fg)]"
                        title={isCritical ? "Remains critical within horizon" : "Mitigation still crosses critical within horizon"}
                      >
                        <span aria-hidden>⚠</span>
                        {mitigationLabel}
                      </span>
                    )}
                    {showConfidence && confBand != null && (
                      <span
                        className="text-xs text-[var(--ds-text-muted)]"
                        title="Forecast Confidence: Based on history depth, momentum stability, and volatility."
                      >
                        {typeof confScore === "number" ? `${Math.round(confScore)}%` : "—"} • {confBand.charAt(0).toUpperCase() + confBand.slice(1)}
                      </span>
                    )}
                    {showTags.map((t) => (
                      <span
                        key={t}
                        className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${ALERT_TAG_CLASS[t] ?? ""}`}
                      >
                        {t}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="inline-flex rounded px-1.5 py-0.5 text-xs font-medium bg-[var(--ds-status-neutral-bg)] text-[var(--ds-status-neutral-subtle-fg)]">
                        +{extra}
                      </span>
                    )}
                  </div>
                  {"rank" in row && row.rank > 0 && (
                    <span className="text-xs text-[var(--ds-text-muted)]">#{row.rank}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
