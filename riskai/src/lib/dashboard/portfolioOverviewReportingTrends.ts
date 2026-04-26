import type { PortfolioNeedsAttentionHealthRun } from "@/lib/dashboard/needsAttentionHealthRun";
import type { PortfolioReportingFooterRow } from "@/lib/dashboard/reportingPositionRag";
import { computeCoverageRatioByCurrency } from "@/lib/portfolioContingencyAggregate";
import type { ProjectCurrency } from "@/lib/projectContext";
import {
  aggregatePortfolioRag,
  RAG_SORT_ORDER,
  type ProjectTilePayload,
  type RagStatus,
} from "@/lib/dashboard/projectTileServerData";
import { formatDurationDays } from "@/lib/formatDuration";

export type PortfolioReportingTrendLine = { text: string; className: string };

/** Per-row MoM lines beside cost donut metrics (single-currency comparable scope only). */
export type CostCoverageSidebarMoM = {
  costExposure: PortfolioReportingTrendLine | null;
  contingency: PortfolioReportingTrendLine | null;
  coverageRatio: PortfolioReportingTrendLine | null;
};

/** Per-row MoM lines beside schedule donut metrics. */
export type ScheduleCoverageSidebarMoM = {
  scheduleExposure: PortfolioReportingTrendLine | null;
  scheduleContingencyWorkingDays: PortfolioReportingTrendLine | null;
  /** Null when exposure or reserve is zero in either month (no comparable ratio). */
  scheduleCoverageRatio: PortfolioReportingTrendLine | null;
};

export type PortfolioOverviewReportingTrendSet = {
  portfolioRiskRating: PortfolioReportingTrendLine | null;
  /** Month-over-month change in scoped project count (locked reporting snapshot scope). */
  activeProjects: PortfolioReportingTrendLine | null;
  activeRisks: PortfolioReportingTrendLine | null;
  needsAttention: PortfolioReportingTrendLine | null;
  costCoverageSidebarMoM: CostCoverageSidebarMoM | null;
  scheduleCoverageSidebarMoM: ScheduleCoverageSidebarMoM | null;
};

type MonthSnapshot = {
  projectTilePayloads: ProjectTilePayload[];
  portfolioReportingFooter: PortfolioReportingFooterRow | null;
  activeRiskCount: number;
  needsAttentionHealthRun: PortfolioNeedsAttentionHealthRun;
  /** When both months include these maps, cost sidebar MoM rows are computed (single-currency rows only). */
  exposureByCurrency?: Map<ProjectCurrency, number>;
  contingencyByCurrency?: Map<ProjectCurrency, number>;
  scheduleExposureTotalDays?: number;
  scheduleContingencyTotalWorkingDays?: number;
  scheduleCoverageRatio?: number | null;
};

const T = {
  line: "ds-trend-line",
  lineCard: "ds-trend-line ds-trend-line--card",
  attention: "ds-trend-line ds-trend-line--attention",
  favorable: "ds-trend-sentiment--favorable",
  unfavorable: "ds-trend-sentiment--unfavorable",
  neutral: "ds-trend-sentiment--neutral",
};

function cx(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

function effectivePortfolioTileRag(
  footer: PortfolioReportingFooterRow | null,
  tiles: ProjectTilePayload[]
): RagStatus | null {
  if (footer != null) return footer.rag;
  return aggregatePortfolioRag(tiles);
}

function singleCurrencyPositiveMillions(
  map: Map<ProjectCurrency, number>
): { c: ProjectCurrency; m: number } | null {
  const nonzero = [...map.entries()].filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  if (nonzero.length !== 1) return null;
  return { c: nonzero[0][0], m: nonzero[0][1] };
}

function moneyMoMExposure(deltaAbsDollars: number, formatMoney: (abs: number) => string): PortfolioReportingTrendLine {
  if (deltaAbsDollars === 0) {
    return { text: "→ Unchanged", className: cx(T.lineCard, T.neutral) };
  }
  const abs = Math.abs(deltaAbsDollars);
  const up = deltaAbsDollars > 0;
  return up
    ? { text: `↑ ${formatMoney(abs)}`, className: cx(T.lineCard, T.unfavorable) }
    : { text: `↓ ${formatMoney(abs)}`, className: cx(T.lineCard, T.favorable) };
}

function moneyMoMContingency(deltaAbsDollars: number, formatMoney: (abs: number) => string): PortfolioReportingTrendLine {
  if (deltaAbsDollars === 0) {
    return { text: "→ Unchanged", className: cx(T.lineCard, T.neutral) };
  }
  const abs = Math.abs(deltaAbsDollars);
  const up = deltaAbsDollars > 0;
  return up
    ? { text: `↑ ${formatMoney(abs)}`, className: cx(T.lineCard, T.favorable) }
    : { text: `↓ ${formatMoney(abs)}`, className: cx(T.lineCard, T.unfavorable) };
}

function formatScheduleExposureDeltaAbsDays(absDays: number): string {
  if (!Number.isFinite(absDays) || absDays < 0) return "—";
  return formatDurationDays(absDays);
}

function coverageRatioPpMoM(deltaPctPoints: number): PortfolioReportingTrendLine {
  const rounded = Math.round(deltaPctPoints);
  if (rounded === 0) {
    return { text: "→ Unchanged", className: cx(T.lineCard, T.neutral) };
  }
  return rounded > 0
    ? { text: `↑ ${Math.abs(rounded)}%`, className: cx(T.lineCard, T.favorable) }
    : { text: `↓ ${Math.abs(rounded)}%`, className: cx(T.lineCard, T.unfavorable) };
}

function scheduleExposureDaysMoM(deltaDays: number): PortfolioReportingTrendLine {
  if (deltaDays === 0) {
    return { text: "→ Unchanged", className: cx(T.lineCard, T.neutral) };
  }
  const label = formatScheduleExposureDeltaAbsDays(Math.abs(deltaDays));
  return deltaDays > 0
    ? { text: `↑ ${label}`, className: cx(T.lineCard, T.unfavorable) }
    : { text: `↓ ${label}`, className: cx(T.lineCard, T.favorable) };
}

function scheduleWorkingDaysHeldMoM(deltaWorkingDays: number): PortfolioReportingTrendLine {
  if (deltaWorkingDays === 0) {
    return { text: "→ Unchanged", className: cx(T.lineCard, T.neutral) };
  }
  const label = formatDurationDays(Math.abs(deltaWorkingDays));
  return deltaWorkingDays > 0
    ? { text: `↑ ${label}`, className: cx(T.lineCard, T.favorable) }
    : { text: `↓ ${label}`, className: cx(T.lineCard, T.unfavorable) };
}

function scheduleRatioMoM(curr: number | null, prev: number | null): PortfolioReportingTrendLine | null {
  if (curr == null || prev == null || !Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  const d = (curr - prev) * 100;
  const rounded = Math.round(d);
  if (rounded === 0) {
    return { text: "→ Unchanged", className: cx(T.lineCard, T.neutral) };
  }
  return rounded > 0
    ? { text: `↑ ${Math.abs(rounded)}%`, className: cx(T.lineCard, T.favorable) }
    : { text: `↓ ${Math.abs(rounded)}%`, className: cx(T.lineCard, T.unfavorable) };
}

function buildCostCoverageSidebarMoM(
  current: MonthSnapshot,
  previous: MonthSnapshot,
  formatMoney: (absDollars: number) => string
): CostCoverageSidebarMoM | null {
  const ce = current.exposureByCurrency;
  const pe = previous.exposureByCurrency;
  const cc = current.contingencyByCurrency;
  const pc = previous.contingencyByCurrency;
  if (ce == null || pe == null || cc == null || pc == null) return null;

  let costExposure: PortfolioReportingTrendLine | null = null;
  const currE = singleCurrencyPositiveMillions(ce);
  const prevE = singleCurrencyPositiveMillions(pe);
  if (currE != null && prevE != null && currE.c === prevE.c) {
    const delta = (currE.m - prevE.m) * 1_000_000;
    costExposure = moneyMoMExposure(delta, formatMoney);
  }

  let contingency: PortfolioReportingTrendLine | null = null;
  const currC = singleCurrencyPositiveMillions(cc);
  const prevC = singleCurrencyPositiveMillions(pc);
  if (currC != null && prevC != null && currC.c === prevC.c) {
    const delta = (currC.m - prevC.m) * 1_000_000;
    contingency = moneyMoMContingency(delta, formatMoney);
  }

  let coverageRatio: PortfolioReportingTrendLine | null = null;
  const currRatios = computeCoverageRatioByCurrency(cc, ce);
  const prevRatios = computeCoverageRatioByCurrency(pc, pe);
  if (currRatios.size === 1 && prevRatios.size === 1) {
    const c1 = [...currRatios.entries()][0];
    const p1 = [...prevRatios.entries()][0];
    if (c1[0] === p1[0]) {
      coverageRatio = coverageRatioPpMoM((c1[1] - p1[1]) * 100);
    }
  }

  return { costExposure, contingency, coverageRatio };
}

function buildScheduleCoverageSidebarMoM(
  current: MonthSnapshot,
  previous: MonthSnapshot
): ScheduleCoverageSidebarMoM | null {
  const cd = current.scheduleExposureTotalDays;
  const pd = previous.scheduleExposureTotalDays;
  const cw = current.scheduleContingencyTotalWorkingDays;
  const pw = previous.scheduleContingencyTotalWorkingDays;
  const cr = current.scheduleCoverageRatio;
  const pr = previous.scheduleCoverageRatio;
  if (
    cd == null ||
    pd == null ||
    cw == null ||
    pw == null ||
    !Number.isFinite(cd) ||
    !Number.isFinite(pd) ||
    !Number.isFinite(cw) ||
    !Number.isFinite(pw)
  ) {
    return null;
  }

  return {
    scheduleExposure: scheduleExposureDaysMoM(cd - pd),
    scheduleContingencyWorkingDays: scheduleWorkingDaysHeldMoM(cw - pw),
    scheduleCoverageRatio: scheduleRatioMoM(cr ?? null, pr ?? null),
  };
}

/**
 * Month-over-month trends vs the calendar previous reporting month.
 * Omit lines when inputs are insufficient (callers skip entirely when the prior month has no locked projects).
 */
export function computePortfolioOverviewReportingTrends(
  current: MonthSnapshot,
  previous: MonthSnapshot,
  options: { formatGapMoneyDelta: (absDollars: number) => string }
): PortfolioOverviewReportingTrendSet {
  const formatMoney = options.formatGapMoneyDelta;

  const costCoverageSidebarMoM = buildCostCoverageSidebarMoM(current, previous, formatMoney);
  const scheduleCoverageSidebarMoM = buildScheduleCoverageSidebarMoM(current, previous);

  const currRag = effectivePortfolioTileRag(
    current.portfolioReportingFooter,
    current.projectTilePayloads
  );
  const prevRag = effectivePortfolioTileRag(
    previous.portfolioReportingFooter,
    previous.projectTilePayloads
  );

  let portfolioRiskRating: PortfolioReportingTrendLine | null = null;
  if (currRag != null && prevRag != null) {
    const before = RAG_SORT_ORDER[prevRag];
    const after = RAG_SORT_ORDER[currRag];
    if (after > before) {
      portfolioRiskRating = {
        text: "Improving",
        className: cx(T.line, T.favorable),
      };
    } else if (after < before) {
      portfolioRiskRating = {
        text: "Deteriorating",
        className: cx(T.line, T.unfavorable),
      };
    } else {
      portfolioRiskRating = {
        text: "→ Unchanged",
        className: cx(T.line, T.neutral),
      };
    }
  }

  let activeProjects: PortfolioReportingTrendLine | null = null;
  {
    const d = current.projectTilePayloads.length - previous.projectTilePayloads.length;
    if (d === 0) {
      activeProjects = { text: "→ Unchanged", className: cx(T.line, T.neutral) };
    } else if (d > 0) {
      activeProjects = {
        text: `↑ ${d} vs last month`,
        className: cx(T.line, T.favorable),
      };
    } else {
      activeProjects = {
        text: `↓ ${Math.abs(d)} vs last month`,
        className: cx(T.line, T.unfavorable),
      };
    }
  }

  let activeRisks: PortfolioReportingTrendLine | null = null;
  {
    const d = current.activeRiskCount - previous.activeRiskCount;
    if (d === 0) {
      activeRisks = { text: "→ Unchanged", className: cx(T.line, T.neutral) };
    } else if (d > 0) {
      activeRisks = {
        text: `↑ ${d} vs last month`,
        className: cx(T.line, T.unfavorable),
      };
    } else {
      activeRisks = {
        text: `↓ ${Math.abs(d)} vs last month`,
        className: cx(T.line, T.favorable),
      };
    }
  }

  let needsAttention: PortfolioReportingTrendLine | null = null;
  {
    const d =
      current.needsAttentionHealthRun.healthScore - previous.needsAttentionHealthRun.healthScore;
    if (d === 0) {
      needsAttention = {
        text: "→ Unchanged",
        className: cx(T.attention, T.neutral),
      };
    } else if (d > 0) {
      /* Higher score = better health: ↓ reads as “pressure down” vs prior month. */
      needsAttention = {
        text: `↓ ${d} vs last month`,
        className: cx(T.attention, T.favorable),
      };
    } else {
      needsAttention = {
        text: `↑ ${Math.abs(d)} vs last month`,
        className: cx(T.attention, T.unfavorable),
      };
    }
  }

  return {
    portfolioRiskRating,
    activeProjects,
    activeRisks,
    needsAttention,
    costCoverageSidebarMoM,
    scheduleCoverageSidebarMoM,
  };
}
