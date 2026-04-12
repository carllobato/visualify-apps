"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectTile } from "@/components/dashboard/ProjectTile";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import {
  buildNeedsAttentionScoreCard,
  type NeedsAttentionStaleCopyMode,
} from "@/lib/dashboard/needsAttentionHealthRun";
import {
  sortProjectTilesByRag,
  type PortfolioNeedsAttentionHealthRun,
  type PortfolioProjectCoverageRow,
  type PortfolioProjectRiskStatusRow,
  type PortfolioProjectScheduleCoverageRow,
  type PortfolioReportingFooterRow,
  type ProjectTilePayload,
  type RagStatus,
} from "@/lib/dashboard/projectTileServerData";
import { formatDurationDays } from "@/lib/formatDuration";
import type { ProjectCurrency } from "@/lib/projectContext";
import {
  DEFAULT_REPORTING_UNIT,
  formatCurrencyInReportingUnit,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import { riskaiPath } from "@/lib/routes";
import {
  Button,
  Card,
  CardBody,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";

/** `h2` id in this modal — use for `aria-labelledby` when embedding tables (e.g. category/owner breakdown). */
export const DOCUMENT_KPI_MODAL_TITLE_ID = "document-kpi-dialog-title";

/** Portfolio overview KPI tile + modal slide title for the project count (must match page `kpiTiles`). */
export const PORTFOLIO_ACTIVE_PROJECTS_KPI_TITLE = "Active Projects";

/** Portfolio overview KPI tile + modal slide title for the health run score (must match page `kpiTiles`). */
export const PORTFOLIO_HEALTH_KPI_TITLE = "Portfolio Health";

export type DocumentKpiTileItem = {
  title: string;
  primaryValue: string;
  /** Optional class for the large primary figure (tile + simple modal pane). */
  primaryValueClassName?: string;
  /** RAG dot before the primary value (Portfolio Risk Rating); matches table `OverallRagCell`. */
  primaryRagDot?: RagStatus;
  subtext?: string;
  /** Optional primary navigation from the detail view (tile no longer navigates directly). */
  actionHref?: string;
  actionLabel?: string;
};

type DocumentKpiModalProps = {
  open: boolean;
  tiles: DocumentKpiTileItem[];
  /** Controlled index so the page can highlight the matching tile (including when Prev/Next changes it). */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** When set with `projectTilePayloads`, the Projects KPI shows the same list as `/portfolios/:id/projects`. */
  portfolioId?: string;
  reportingUnit?: ReportingUnitOption;
  projectTilePayloads?: ProjectTilePayload[];
  /** Per-project lifecycle status counts for the Active Risks KPI modal. */
  activeRiskStatusSummaryRows?: PortfolioProjectRiskStatusRow[];
  /** Per-project contingency vs exposure for the Cost Exposure & Coverage KPI modal. */
  coverageRatioRows?: PortfolioProjectCoverageRow[];
  /** Per-project schedule exposure, contingency (weeks), and coverage — Schedule Exposure & Coverage KPI modal. */
  scheduleCoverageRows?: PortfolioProjectScheduleCoverageRow[];
  /** Health run score card (Portfolio Health KPI modal). */
  needsAttentionHealthRun?: PortfolioNeedsAttentionHealthRun;
  /** Aligns stale-line copy with portfolio reporting month selection; defaults to UTC-month snapshot wording. */
  needsAttentionStaleCopyMode?: NeedsAttentionStaleCopyMode;
  /** Portfolio Σ held vs Σ at-target-P row for Portfolio Risk Rating modal. */
  portfolioReportingFooter?: PortfolioReportingFooterRow | null;
  /**
   * When set, non-null return value replaces the default KPI body for that slide index (e.g. portfolio overview
   * slides 6–13 — Status through Top 5 Schedule Opportunities). Return `null` to use the standard title-based KPI content.
   */
  renderSlideBodyByIndex?: (slideIndex: number) => ReactNode | null;
};

/** Same shell + density as {@link RiskRegisterTable} (`Card` + DS `Table`). */
const KPI_MODAL_REGISTER_TABLE_CLASS =
  "w-full min-w-[44rem] [&_tbody_td]:py-[10px] [&_tfoot_td]:py-[10px] [&_tfoot_th]:py-[10px] [&_thead_th]:py-1.5 [&_thead_th]:text-[11px] [&_thead_th]:text-[var(--ds-text-muted)]";

/** Active risks by status: project column + four equal numeric columns (see {@link PortfolioActiveRisksKpiModalBody}). */
const KPI_MODAL_ACTIVE_RISKS_TABLE_CLASS = `${KPI_MODAL_REGISTER_TABLE_CLASS} table-fixed`;
const KPI_MODAL_ACTIVE_RISKS_PROJECT_COL = "align-middle w-[40%] min-w-0";
const KPI_MODAL_ACTIVE_RISKS_STATUS_COL = "!text-right align-middle w-[15%]";
const KPI_MODAL_ACTIVE_RISKS_STATUS_CELL =
  "w-[15%] text-right tabular-nums align-middle text-[var(--ds-text-primary)]";

/** Portfolio reporting table: project + three equal metric columns (see {@link PortfolioRagKpiModalBody}). */
const KPI_MODAL_REPORTING_PROJECT_COL =
  "align-middle w-[40%] min-w-[16rem] sm:min-w-[20rem] lg:min-w-[24rem]";
const KPI_MODAL_REPORTING_METRIC_COL = "align-middle w-[20%]";
const KPI_MODAL_REPORTING_LINE_CELL = "align-middle text-[length:var(--ds-text-sm)] w-[20%]";
const KPI_MODAL_REPORTING_OVERALL_CELL = "align-middle w-[20%]";

function ragDotClass(status: RagStatus): string {
  switch (status) {
    case "green":
      return "bg-[var(--ds-status-success)]";
    case "amber":
      return "bg-[var(--ds-status-warning)]";
    case "red":
      return "bg-[var(--ds-status-danger)]";
    default:
      return "bg-[var(--ds-status-neutral)]";
  }
}

function ragWord(status: RagStatus): string {
  switch (status) {
    case "green":
      return "Green";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    default:
      return "";
  }
}

/** True for {@link formatReportingLineStatus} “On track” (cost/time cell label). */
function reportingLineLabelIsOnTrack(label: string | undefined): boolean {
  return (label?.trim().toLowerCase() ?? "").startsWith("on track");
}

/** Reporting line label (Cost / Time) — matches {@link formatReportingLineStatus} semantics. */
function reportingLineCellClass(label: string | undefined): string {
  const v = label?.trim() ?? "";
  if (v === "" || v === "—") return "text-[var(--ds-text-muted)] tabular-nums";
  if (v.startsWith("Off")) return "font-medium text-[var(--ds-status-danger-fg)] tabular-nums";
  if (v.startsWith("At risk")) return "font-medium text-[var(--ds-status-warning-fg)] tabular-nums";
  return "font-medium text-[var(--ds-status-success-fg)] tabular-nums";
}

/** Dot fill for cost/time line — aligned with {@link ragDotClass} / Overall column. */
function reportingLineStatusDotClass(label: string | undefined): string {
  const v = label?.trim() ?? "";
  if (v === "" || v === "—") return "bg-[var(--ds-status-neutral)]";
  if (v.startsWith("Off")) return "bg-[var(--ds-status-danger)]";
  if (v.startsWith("At risk")) return "bg-[var(--ds-status-warning)]";
  return "bg-[var(--ds-status-success)]";
}

/** Cost or time status label with the same leading dot pattern as {@link OverallRagCell}. */
function ReportingLineStatusWithDot({ label }: { label: string | undefined }) {
  const display = label?.trim() ? label : "—";
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="inline-flex shrink-0 items-center" aria-hidden>
        <span className={`size-[0.6875rem] shrink-0 rounded-full ${reportingLineStatusDotClass(label)}`} />
      </span>
      <span className={`min-w-0 ${reportingLineCellClass(label)}`}>{display}</span>
    </div>
  );
}

function localeForProjectCurrency(currency: ProjectCurrency | undefined): string {
  return currency === "AUD" ? "en-AU" : "en-US";
}

/** Project column: lock date + P-band + currency — ties the row to the metric sublines. */
function reportingProjectSupportingLine(p: ProjectTilePayload): string | null {
  const parts: string[] = [];
  const raw = p.reportingLockedAt;
  if (typeof raw === "string" && raw.trim() !== "") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const loc = localeForProjectCurrency(p.reportingDriverCurrency);
      parts.push(
        `Locked ${d.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`
      );
    }
  }
  if (p.reportingDriverTargetP != null && p.reportingDriverCurrency != null) {
    parts.push(`P${Math.round(p.reportingDriverTargetP)} · ${p.reportingDriverCurrency}`);
  } else if (p.reportingDriverCurrency != null) {
    parts.push(p.reportingDriverCurrency);
  } else if (p.reportingDriverTargetP != null) {
    parts.push(`P${Math.round(p.reportingDriverTargetP)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function reportingPortfolioSupportingLine(
  footer: PortfolioReportingFooterRow,
  rowCount: number
): string {
  return `${rowCount} project${rowCount === 1 ? "" : "s"} · ${footer.driverCurrency} · mean P${Math.round(footer.driverTargetP)}`;
}

function reportingOverallCellClass(label: string | undefined): string {
  const v = label?.trim() ?? "";
  if (v === "" || v === "—") return "text-[var(--ds-text-muted)]";
  if (v === "Off Track") return "font-semibold text-[var(--ds-status-danger-fg)]";
  if (v === "At Risk") return "font-semibold text-[var(--ds-status-warning-fg)]";
  if (v === "On Track") return "font-semibold text-[var(--ds-status-success-fg)]";
  return "font-medium text-[var(--ds-text-primary)]";
}

/** Simulated total cost at appetite P: `$Xm (P90)` when available, else `P90` only. */
function reportingCostAtPTargetPhrase(
  p: ProjectTilePayload,
  reportingUnit: ReportingUnitOption
): string | null {
  const amt = p.reportingCostAtTargetPDollars;
  const cur = p.reportingDriverCurrency;
  const tp = p.reportingDriverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  if (amt != null && cur != null && Number.isFinite(amt) && amt > 0) {
    return `${formatCurrencyInReportingUnit(amt, cur, reportingUnit)} (P${pr})`;
  }
  return `P${pr}`;
}

/** Simulated delay at appetite P: `3 wk (P90)` when available, else `P90` only. */
function reportingDelayAtPTargetPhrase(p: ProjectTilePayload): string | null {
  const days = p.reportingTimeAtTargetPDays;
  const tp = p.reportingDriverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  if (days != null && Number.isFinite(days) && days >= 0) {
    return `${formatDurationDays(days, { weekDecimals: 1 })} (P${pr})`;
  }
  return `P${pr}`;
}

function portfolioCostAtPTargetPhrase(
  footer: PortfolioReportingFooterRow,
  reportingUnit: ReportingUnitOption
): string | null {
  const amt = footer.sumCostAtTargetPDollars;
  const cur = footer.driverCurrency;
  const tp = footer.driverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  if (amt != null && cur != null && Number.isFinite(amt) && amt > 0) {
    return `${formatCurrencyInReportingUnit(amt, cur, reportingUnit)} (P${pr})`;
  }
  return `P${pr}`;
}

function portfolioDelayAtPTargetPhrase(footer: PortfolioReportingFooterRow): string | null {
  const days = footer.sumDelayAtTargetPDays;
  const tp = footer.driverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  if (days != null && Number.isFinite(days) && days >= 0) {
    return `${formatDurationDays(days, { weekDecimals: 1 })} (P${pr})`;
  }
  return `P${pr}`;
}

/**
 * Muted subline for cost. “On track” uses band logic (coverage vs mean P); dollar gap is absolute
 * Σ(req−held) — use “short” wording only when the band is not on track.
 */
function reportingCostMetricSubline(
  p: ProjectTilePayload,
  reportingUnit: ReportingUnitOption
): string | null {
  const cur = p.reportingDriverCurrency;
  const tp = p.reportingDriverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  const atP = reportingCostAtPTargetPhrase(p, reportingUnit) ?? `P${pr}`;
  const short = p.reportingCostShortfallAbs;
  const sur = p.reportingCostSurplusAbs;
  if (cur == null) return null;
  if (short != null && Number.isFinite(short) && short > 0) {
    const fmt = formatCurrencyInReportingUnit(short, cur, reportingUnit);
    if (reportingLineLabelIsOnTrack(p.reportingCostStatus)) {
      return `P${pr} band on track · ${fmt} below ${atP}`;
    }
    return `Contingency short: ${fmt} v ${atP}`;
  }
  if (sur != null && Number.isFinite(sur) && sur > 0) {
    return `Contingency headroom: ${formatCurrencyInReportingUnit(sur, cur, reportingUnit)} v ${atP}`;
  }
  const st = p.reportingCostStatus?.trim() ?? "";
  if (st !== "" && st !== "—") {
    const hasSimCost = p.reportingCostAtTargetPDollars != null && p.reportingCostAtTargetPDollars > 0;
    return hasSimCost ? `Contingency v ${atP}` : `Contingency v ${atP} (${cur})`;
  }
  return null;
}

/** Muted subline for schedule — same band vs absolute gap distinction as cost. */
function reportingTimeMetricSubline(p: ProjectTilePayload): string | null {
  const tp = p.reportingDriverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  const atP = reportingDelayAtPTargetPhrase(p) ?? `P${pr}`;
  const short = p.reportingTimeShortfallDays;
  const sur = p.reportingTimeSurplusDays;
  if (short != null && Number.isFinite(short) && short > 0) {
    const dur = formatDurationDays(short, { weekDecimals: 1 });
    if (reportingLineLabelIsOnTrack(p.reportingTimeStatus)) {
      return `P${pr} band on track · ${dur} below ${atP}`;
    }
    return `Schedule short: ${dur} v ${atP}`;
  }
  if (sur != null && Number.isFinite(sur) && sur > 0) {
    return `Schedule buffer: ${formatDurationDays(sur, { weekDecimals: 1 })} v ${atP}`;
  }
  const st = p.reportingTimeStatus?.trim() ?? "";
  if (st !== "" && st !== "—") {
    return `Schedule v ${atP}`;
  }
  return null;
}

function portfolioReportingCostMetricSubline(
  footer: PortfolioReportingFooterRow,
  reportingUnit: ReportingUnitOption
): string | null {
  const cur = footer.driverCurrency;
  const tp = footer.driverTargetP;
  if (cur == null || tp == null) return null;
  const pr = Math.round(tp);
  const atP = portfolioCostAtPTargetPhrase(footer, reportingUnit) ?? `P${pr}`;
  const short = footer.costShortfallAbs;
  const sur = footer.costSurplusAbs;
  if (short != null && Number.isFinite(short) && short > 0) {
    const fmt = formatCurrencyInReportingUnit(short, cur, reportingUnit);
    if (reportingLineLabelIsOnTrack(footer.costStatus)) {
      return `P${pr} band on track · ${fmt} below ${atP}`;
    }
    return `Contingency short: ${fmt} v ${atP}`;
  }
  if (sur != null && Number.isFinite(sur) && sur > 0) {
    return `Contingency headroom: ${formatCurrencyInReportingUnit(sur, cur, reportingUnit)} v ${atP}`;
  }
  if (footer.costStatus?.trim() && footer.costStatus !== "—") {
    const hasSimCost = footer.sumCostAtTargetPDollars != null && footer.sumCostAtTargetPDollars > 0;
    return hasSimCost ? `Contingency v ${atP}` : `Contingency v ${atP} (${cur})`;
  }
  return null;
}

function portfolioReportingTimeMetricSubline(footer: PortfolioReportingFooterRow): string | null {
  const tp = footer.driverTargetP;
  if (tp == null) return null;
  const pr = Math.round(tp);
  const atP = portfolioDelayAtPTargetPhrase(footer) ?? `P${pr}`;
  const short = footer.timeShortfallDays;
  const sur = footer.timeSurplusDays;
  if (short != null && Number.isFinite(short) && short > 0) {
    const dur = formatDurationDays(short, { weekDecimals: 1 });
    if (reportingLineLabelIsOnTrack(footer.timeStatus)) {
      return `P${pr} band on track · ${dur} below ${atP}`;
    }
    return `Schedule short: ${dur} v ${atP}`;
  }
  if (sur != null && Number.isFinite(sur) && sur > 0) {
    return `Schedule buffer: ${formatDurationDays(sur, { weekDecimals: 1 })} v ${atP}`;
  }
  if (footer.timeStatus?.trim() && footer.timeStatus !== "—") {
    return `Schedule v ${atP}`;
  }
  return null;
}

function OverallRagCell({
  overallLabel,
  rag,
}: {
  overallLabel: string | undefined;
  rag: RagStatus;
}) {
  const o = overallLabel?.trim() ?? "";
  const hasOverall = o !== "" && o !== "—";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      <span
        className="inline-flex items-center shrink-0"
        title={ragWord(rag)}
        aria-label={`RAG ${ragWord(rag)}`}
      >
        <span className={`size-[0.6875rem] shrink-0 rounded-full ${ragDotClass(rag)}`} aria-hidden />
      </span>
      <span
        className={`min-w-0 text-[length:var(--ds-text-sm)] ${hasOverall ? reportingOverallCellClass(overallLabel) : "text-[var(--ds-text-muted)]"}`}
      >
        {hasOverall ? o : "—"}
      </span>
    </div>
  );
}

function PortfolioRagKpiModalBody({
  projectTilePayloads,
  portfolioReportingFooter,
  reportingUnit = DEFAULT_REPORTING_UNIT,
}: {
  projectTilePayloads: ProjectTilePayload[];
  portfolioReportingFooter: PortfolioReportingFooterRow | null;
  reportingUnit?: ReportingUnitOption;
}) {
  const router = useRouter();
  const rows = sortProjectTilesByRag([...projectTilePayloads]);

  const goToProject = (projectId: string) => {
    router.push(riskaiPath(`/projects/${projectId}`));
  };

  if (rows.length === 0) {
    return <p className="ds-kpi-modal-empty">No projects in this portfolio yet.</p>;
  }

  const footer = portfolioReportingFooter;
  const footerCostMetric = footer != null ? portfolioReportingCostMetricSubline(footer, reportingUnit) : null;
  const footerTimeMetric = footer != null ? portfolioReportingTimeMetricSubline(footer) : null;

  return (
    <>
      <Card className="overflow-hidden border-[var(--ds-border-subtle)] p-0">
        <Table className={`${KPI_MODAL_REGISTER_TABLE_CLASS} min-w-[44rem] table-fixed w-full`}>
          <caption className="sr-only">
            Project-level reporting position — cost, time, overall and RAG from last reporting run where available
          </caption>
          <TableHead>
            <TableRow>
              <TableHeaderCell className={KPI_MODAL_REPORTING_PROJECT_COL}>Project</TableHeaderCell>
              <TableHeaderCell className={KPI_MODAL_REPORTING_METRIC_COL}>Cost status</TableHeaderCell>
              <TableHeaderCell className={KPI_MODAL_REPORTING_METRIC_COL}>Time status</TableHeaderCell>
              <TableHeaderCell className={KPI_MODAL_REPORTING_METRIC_COL}>Overall / RAG</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => {
              const costMetric = reportingCostMetricSubline(p, reportingUnit);
              const timeMetric = reportingTimeMetricSubline(p);
              const projectSupporting = reportingProjectSupportingLine(p);
              return (
              <TableRow
                key={p.id}
                className="cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]"
                tabIndex={0}
                role="button"
                aria-label={`Open project ${p.name ?? p.id}`}
                onClick={() => goToProject(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToProject(p.id);
                  }
                }}
              >
                <TableCell className={`min-w-0 ${KPI_MODAL_REPORTING_PROJECT_COL}`}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className="block min-w-0 truncate font-medium text-[var(--ds-text-primary)]"
                      title={p.name ?? p.id}
                    >
                      {p.name?.trim() || p.id}
                    </span>
                    {projectSupporting != null && projectSupporting !== "" ? (
                      <span className="text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-muted)] tabular-nums">
                        {projectSupporting}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <ReportingLineStatusWithDot label={p.reportingCostStatus} />
                    {costMetric != null && costMetric !== "" ? (
                      <span className="text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-muted)] tabular-nums">
                        {costMetric}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <ReportingLineStatusWithDot label={p.reportingTimeStatus} />
                    {timeMetric != null && timeMetric !== "" ? (
                      <span className="text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-muted)] tabular-nums">
                        {timeMetric}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_OVERALL_CELL}>
                  <OverallRagCell overallLabel={p.reportingOverallStatus} rag={p.ragStatus} />
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
          {footer != null ? (
            <tfoot className="border-t border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_65%,transparent)]">
              <TableRow>
                <TableHeaderCell
                  scope="row"
                  className={`${KPI_MODAL_REPORTING_PROJECT_COL} !text-left !normal-case tracking-normal align-top text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]`}
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span>Portfolio</span>
                    <span className="text-[length:var(--ds-text-xs)] font-normal leading-snug text-[var(--ds-text-muted)] tabular-nums">
                      {reportingPortfolioSupportingLine(footer, rows.length)}
                    </span>
                  </div>
                </TableHeaderCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <ReportingLineStatusWithDot label={footer.costStatus} />
                    {footerCostMetric != null && footerCostMetric !== "" ? (
                      <span className="text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-muted)] tabular-nums">
                        {footerCostMetric}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <ReportingLineStatusWithDot label={footer.timeStatus} />
                    {footerTimeMetric != null && footerTimeMetric !== "" ? (
                      <span className="text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-muted)] tabular-nums">
                        {footerTimeMetric}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_OVERALL_CELL}>
                  <OverallRagCell overallLabel={footer.overallStatus} rag={footer.rag} />
                </TableCell>
              </TableRow>
            </tfoot>
          ) : null}
        </Table>
      </Card>
    </>
  );
}

function PortfolioProjectsKpiModalBody({
  portfolioId,
  projectTilePayloads,
}: {
  portfolioId: string;
  projectTilePayloads: ProjectTilePayload[];
}) {
  return projectTilePayloads.length === 0 ? (
    <Card variant="inset" className="w-full max-w-none text-center">
      <CardBody className="py-[var(--ds-space-6)]">
        <p className="ds-dashboard-empty-title">No projects in this portfolio yet</p>
        <OpenProjectOnboardingLink className="ds-dashboard-empty-primary" portfolioId={portfolioId}>
          Create project
        </OpenProjectOnboardingLink>
        <div className="mt-5">
          <Link href={riskaiPath("/projects")} className="ds-text-link-muted text-[length:var(--ds-text-sm)]">
            View all your projects
          </Link>
        </div>
      </CardBody>
    </Card>
  ) : (
    <div className="flex flex-col gap-[var(--ds-space-4)]">
      <div className="ds-dashboard-project-grid">
        {projectTilePayloads.map((payload) => (
          <ProjectTile key={payload.id} payload={payload} />
        ))}
      </div>
      <OpenProjectOnboardingLink className="ds-dashboard-inline-create" portfolioId={portfolioId}>
        <span className="ds-dashboard-inline-create-label">Create project</span>
        <span className="ds-dashboard-inline-create-plus" aria-hidden>
          +
        </span>
      </OpenProjectOnboardingLink>
    </div>
  );
}

function PortfolioActiveRisksKpiModalBody({ rows }: { rows: PortfolioProjectRiskStatusRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return <p className="ds-kpi-modal-empty">No projects in this portfolio yet.</p>;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      open: acc.open + r.open,
      monitoring: acc.monitoring + r.monitoring,
      mitigating: acc.mitigating + r.mitigating,
      closedArchived: acc.closedArchived + r.closedArchived,
    }),
    { open: 0, monitoring: 0, mitigating: 0, closedArchived: 0 }
  );

  const registerHref = (projectId: string) => riskaiPath(`/projects/${projectId}/risks`);

  const goToRiskRegister = (projectId: string) => {
    router.push(registerHref(projectId));
  };

  /** Same shell + density as {@link RiskRegisterTable} (`Card` + DS `Table`). */
  return (
    <Card className="overflow-x-auto overflow-y-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className={KPI_MODAL_ACTIVE_RISKS_TABLE_CLASS}>
        <caption className="sr-only">Active risk counts by project and lifecycle status</caption>
        <TableHead>
          <TableRow>
            <TableHeaderCell className={KPI_MODAL_ACTIVE_RISKS_PROJECT_COL}>Project</TableHeaderCell>
            <TableHeaderCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_COL}>Open</TableHeaderCell>
            <TableHeaderCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_COL}>Monitoring</TableHeaderCell>
            <TableHeaderCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_COL}>Mitigating</TableHeaderCell>
            <TableHeaderCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_COL}>Closed / archived</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.projectId}
              className="cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]"
              tabIndex={0}
              role="button"
              aria-label={`Open risk register for ${r.projectName}`}
              onClick={() => goToRiskRegister(r.projectId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToRiskRegister(r.projectId);
                }
              }}
            >
              <TableCell className={`${KPI_MODAL_ACTIVE_RISKS_PROJECT_COL} max-w-[20rem] align-middle`}>
                <span className="block min-w-0 truncate font-medium text-[var(--ds-text-primary)]" title={r.projectName}>
                  {r.projectName}
                </span>
              </TableCell>
              <TableCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_CELL}>{r.open}</TableCell>
              <TableCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_CELL}>{r.monitoring}</TableCell>
              <TableCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_CELL}>{r.mitigating}</TableCell>
              <TableCell className={KPI_MODAL_ACTIVE_RISKS_STATUS_CELL}>{r.closedArchived}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <tfoot className="border-t border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_65%,transparent)]">
          <TableRow>
            <TableHeaderCell
              scope="row"
              className={`${KPI_MODAL_ACTIVE_RISKS_PROJECT_COL} !text-left !normal-case tracking-normal text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]`}
            >
              Total
            </TableHeaderCell>
            <TableCell className={`${KPI_MODAL_ACTIVE_RISKS_STATUS_CELL} font-semibold`}>{totals.open}</TableCell>
            <TableCell className={`${KPI_MODAL_ACTIVE_RISKS_STATUS_CELL} font-semibold`}>{totals.monitoring}</TableCell>
            <TableCell className={`${KPI_MODAL_ACTIVE_RISKS_STATUS_CELL} font-semibold`}>{totals.mitigating}</TableCell>
            <TableCell className={`${KPI_MODAL_ACTIVE_RISKS_STATUS_CELL} font-semibold`}>{totals.closedArchived}</TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </Card>
  );
}

function formatCoverageRatioPct(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${Math.round(ratio * 100)}%`;
}

function coverageRatioClass(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return "text-[var(--ds-text-muted)] tabular-nums";
  if (ratio < 0.8) return "font-medium text-[var(--ds-status-danger-fg)] tabular-nums";
  if (ratio < 1.0) return "font-medium text-[var(--ds-status-warning-fg)] tabular-nums";
  return "font-medium text-[var(--ds-status-success-fg)] tabular-nums";
}

function formatScheduleContingencyWeeksLabel(weeks: number | null): string {
  if (weeks == null || !Number.isFinite(weeks)) return "—";
  const w = Math.round(weeks);
  if (w === 0) return "0 weeks";
  if (w === 1) return "1 week";
  return `${w} weeks`;
}

/** Portfolio overview combined financial KPI — must match `kpiTiles` title in `PortfolioOverviewContent`. */
export const COST_COVERAGE_COMBINED_TILE_TITLE = "Cost Exposure & Coverage";

/** Portfolio overview schedule KPI — must match `kpiTiles` title in `PortfolioOverviewContent`. */
export const SCHEDULE_COVERAGE_COMBINED_TILE_TITLE = "Schedule Exposure & Coverage";

function PortfolioScheduleCoverageCombinedKpiModalBody({ rows }: { rows: PortfolioProjectScheduleCoverageRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return <p className="ds-kpi-modal-empty">No projects in this portfolio yet.</p>;
  }

  const goToProjectSettings = (projectId: string) => {
    router.push(riskaiPath(`/projects/${projectId}/settings`));
  };

  const totalExpectedDelayWeeks = rows.reduce((a, r) => a + r.expectedDelayWeeks, 0);
  const totalScheduleContingencyWeeks = rows.reduce((a, r) => a + (r.scheduleContingencyWeeks ?? 0), 0);
  const portfolioRatio =
    totalExpectedDelayWeeks > 0 && Number.isFinite(totalScheduleContingencyWeeks)
      ? totalScheduleContingencyWeeks / totalExpectedDelayWeeks
      : null;

  return (
    <Card className="overflow-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className={KPI_MODAL_REGISTER_TABLE_CLASS}>
        <caption className="sr-only">
          Schedule exposure, contingency, and coverage by project with portfolio totals
        </caption>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="align-middle">Project</TableHeaderCell>
            <TableHeaderCell className="!text-right align-middle">Schedule exposure</TableHeaderCell>
            <TableHeaderCell className="!text-right align-middle">Contingency</TableHeaderCell>
            <TableHeaderCell className="!text-right align-middle">Coverage</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.projectId}
              className="cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]"
              tabIndex={0}
              role="button"
              aria-label={`Open project settings for ${r.projectName}`}
              onClick={() => goToProjectSettings(r.projectId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToProjectSettings(r.projectId);
                }
              }}
            >
              <TableCell className="min-w-0 max-w-[24rem] align-middle">
                <span className="block min-w-0 truncate font-medium text-[var(--ds-text-primary)]" title={r.projectName}>
                  {r.projectName}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-secondary)]">
                {r.expectedDelayWeeks > 0
                  ? formatDurationDays(r.expectedDelayWeeks * 7, { weekDecimals: 1 })
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-primary)]">
                {formatScheduleContingencyWeeksLabel(r.scheduleContingencyWeeks)}
              </TableCell>
              <TableCell className="text-right align-middle">
                <span className={coverageRatioClass(r.coverageRatio)}>{formatCoverageRatioPct(r.coverageRatio)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <tfoot className="border-t border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_65%,transparent)]">
          <TableRow>
            <TableHeaderCell
              scope="row"
              className="!text-left !normal-case tracking-normal align-middle text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]"
            >
              Portfolio
            </TableHeaderCell>
            <TableCell className="text-right tabular-nums align-middle font-semibold text-[var(--ds-text-secondary)]">
              {totalExpectedDelayWeeks > 0
                ? formatDurationDays(totalExpectedDelayWeeks * 7, { weekDecimals: 1 })
                : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums align-middle font-semibold text-[var(--ds-text-primary)]">
              {formatScheduleContingencyWeeksLabel(totalScheduleContingencyWeeks)}
            </TableCell>
            <TableCell className="text-right align-middle">
              <span className={`font-semibold ${coverageRatioClass(portfolioRatio)}`}>
                {formatCoverageRatioPct(portfolioRatio)}
              </span>
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </Card>
  );
}

function PortfolioNeedsAttentionKpiModalBody({
  health,
  staleCopyMode = "utcMonthSnapshot",
}: {
  health: PortfolioNeedsAttentionHealthRun;
  staleCopyMode?: NeedsAttentionStaleCopyMode;
}) {
  const { lines, opportunityDetail, totalPenalty } = buildNeedsAttentionScoreCard(health, {
    staleCopyMode,
  });
  const rag = health.primaryRagDot as RagStatus;

  return (
    <Card className="overflow-hidden border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-0 shadow-[var(--ds-elevation-tile)]">
      <div className="border-b border-[var(--ds-border-subtle)] px-5 py-5 sm:px-6 sm:py-6">
        <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">Portfolio health run</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2" title={`RAG ${ragWord(rag)}`}>
            <span className="inline-flex shrink-0 items-center" aria-hidden>
              <span className={`size-[0.75rem] shrink-0 rounded-full ${ragDotClass(rag)}`} />
            </span>
            <span className="text-5xl font-semibold tabular-nums leading-none tracking-tight text-[var(--ds-text-primary)]">
              {health.healthScore}
            </span>
            <span className="pb-0.5 text-base font-medium text-[var(--ds-text-muted)]">/ 100</span>
          </span>
          <span className="pb-0.5 text-sm text-[var(--ds-text-secondary)]">
            −{totalPenalty} pts total · Open / Monitoring use pre-mitigation ratings; Mitigating uses post-mitigation
          </span>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6" role="list">
        {lines.map((line) => {
          const pct = line.maxPenalty > 0 ? Math.min(100, (line.appliedPenalty / line.maxPenalty) * 100) : 0;
          const barTone =
            line.appliedPenalty === 0
              ? "bg-[color-mix(in_oklab,var(--ds-surface-muted)_90%,transparent)]"
              : line.appliedPenalty >= line.maxPenalty
                ? "bg-[var(--ds-status-danger)]"
                : "bg-[var(--ds-status-warning)]";
          return (
            <div
              key={line.id}
              role="listitem"
              className="border-b border-[var(--ds-border-subtle)] py-5 last:border-b-0 last:pb-0 first:pt-0"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
                    {line.title}
                  </h3>
                  <p className="mt-1.5 m-0 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                    {line.detail}
                  </p>
                </div>
                <div className="shrink-0 text-right sm:pt-0.5">
                  <span className="tabular-nums text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
                    −{line.appliedPenalty}
                  </span>
                  <span className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]"> / {line.maxPenalty} pts</span>
                </div>
              </div>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,transparent)]"
                aria-hidden
              >
                <div className={`h-full rounded-full transition-[width] ${barTone}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}

        <div className="mt-6 rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_55%,transparent)] px-4 py-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
            Mitigation upside (informational)
          </p>
          <p className="mt-1.5 m-0 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            {opportunityDetail}
          </p>
        </div>
      </div>
    </Card>
  );
}

function PortfolioCostCoverageCombinedKpiModalBody({
  rows,
  reportingUnit,
}: {
  rows: PortfolioProjectCoverageRow[];
  reportingUnit: ReportingUnitOption;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return <p className="ds-kpi-modal-empty">No projects in this portfolio yet.</p>;
  }

  const currencyList = [...new Set(rows.map((r) => r.currency))];
  const singleCurrency = currencyList.length === 1 ? currencyList[0] : null;

  const totalContingencyAbs = singleCurrency != null ? rows.reduce((a, r) => a + r.contingencyAmountAbs, 0) : null;
  const totalExposureAbs = singleCurrency != null ? rows.reduce((a, r) => a + r.exposureAmountAbs, 0) : null;
  const portfolioRatio =
    totalContingencyAbs != null && totalExposureAbs != null && totalExposureAbs > 0
      ? totalContingencyAbs / totalExposureAbs
      : null;

  const goToProjectSettings = (projectId: string) => {
    router.push(riskaiPath(`/projects/${projectId}/settings`));
  };

  return (
    <Card className="overflow-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className={KPI_MODAL_REGISTER_TABLE_CLASS}>
        <caption className="sr-only">
          Risk exposure, contingency, and coverage by project with portfolio totals
        </caption>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="align-middle">Project</TableHeaderCell>
            <TableHeaderCell className="!text-right align-middle">Risk exposure</TableHeaderCell>
            <TableHeaderCell className="!text-right align-middle">Contingency</TableHeaderCell>
            <TableHeaderCell className="!text-right align-middle">Coverage</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.projectId}
              className="cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]"
              tabIndex={0}
              role="button"
              aria-label={`Open project settings for ${r.projectName}`}
              onClick={() => goToProjectSettings(r.projectId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToProjectSettings(r.projectId);
                }
              }}
            >
              <TableCell className="min-w-0 max-w-[24rem] align-middle">
                <span className="block min-w-0 truncate font-medium text-[var(--ds-text-primary)]" title={r.projectName}>
                  {r.projectName}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-secondary)]">
                {r.exposureAmountAbs > 0
                  ? formatCurrencyInReportingUnit(r.exposureAmountAbs, r.currency, reportingUnit)
                  : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-primary)]">
                {formatCurrencyInReportingUnit(r.contingencyAmountAbs, r.currency, reportingUnit)}
              </TableCell>
              <TableCell className="text-right align-middle">
                <span className={coverageRatioClass(r.ratio)}>{formatCoverageRatioPct(r.ratio)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <tfoot className="border-t border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_65%,transparent)]">
          <TableRow>
            <TableHeaderCell
              scope="row"
              className="!text-left !normal-case tracking-normal align-middle text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]"
            >
              Portfolio
            </TableHeaderCell>
            <TableCell
              className="text-right tabular-nums align-middle font-semibold text-[var(--ds-text-secondary)]"
              title={singleCurrency == null ? "Multiple currencies — not summed" : undefined}
            >
              {singleCurrency != null && totalExposureAbs != null
                ? formatCurrencyInReportingUnit(totalExposureAbs, singleCurrency, reportingUnit)
                : "—"}
            </TableCell>
            <TableCell
              className="text-right tabular-nums align-middle font-semibold text-[var(--ds-text-primary)]"
              title={singleCurrency == null ? "Multiple currencies — not summed" : undefined}
            >
              {singleCurrency != null && totalContingencyAbs != null
                ? formatCurrencyInReportingUnit(totalContingencyAbs, singleCurrency, reportingUnit)
                : "—"}
            </TableCell>
            <TableCell className="text-right align-middle">
              <span className={`font-semibold ${coverageRatioClass(portfolioRatio)}`}>
                {formatCoverageRatioPct(portfolioRatio)}
              </span>
            </TableCell>
          </TableRow>
        </tfoot>
      </Table>
    </Card>
  );
}

/**
 * Read-only KPI detail overlay: same shell as `RiskDetailModal` (backdrop + 70vw panel).
 * Previous / Next move between tiles without closing.
 */
export function DocumentKpiModal({
  open,
  tiles,
  index,
  onIndexChange,
  onClose,
  portfolioId,
  reportingUnit = DEFAULT_REPORTING_UNIT,
  projectTilePayloads,
  portfolioReportingFooter,
  activeRiskStatusSummaryRows,
  coverageRatioRows,
  scheduleCoverageRows,
  needsAttentionHealthRun,
  needsAttentionStaleCopyMode = "utcMonthSnapshot",
  renderSlideBodyByIndex,
}: DocumentKpiModalProps) {
  const last = Math.max(0, tiles.length - 1);
  const safeIndex = Math.min(Math.max(0, index), last);
  const current = tiles[safeIndex] ?? null;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < last;

  useEffect(() => {
    if (!open || tiles.length === 0) return;
    if (index !== safeIndex) onIndexChange(safeIndex);
  }, [open, tiles.length, index, safeIndex, onIndexChange]);

  const goPrev = useCallback(() => {
    if (safeIndex <= 0) return;
    onIndexChange(safeIndex - 1);
  }, [safeIndex, onIndexChange]);

  const goNext = useCallback(() => {
    if (safeIndex >= last) return;
    onIndexChange(safeIndex + 1);
  }, [safeIndex, last, onIndexChange]);

  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key === "ArrowLeft" && canPrev) {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight" && canNext) {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose, canPrev, canNext, goPrev, goNext]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) requestClose();
  };

  if (!open || tiles.length === 0) return null;
  if (typeof document === "undefined") return null;

  const showProjectsList =
    current?.title === PORTFOLIO_ACTIVE_PROJECTS_KPI_TITLE &&
    portfolioId != null &&
    portfolioId !== "" &&
    projectTilePayloads != null;

  const showActiveRisksDetail = current?.title === "Active Risks" && activeRiskStatusSummaryRows != null;

  const showPortfolioRagDetail = current?.title === "Portfolio Risk Rating" && projectTilePayloads != null;

  const showScheduleExposureDetail =
    current?.title === SCHEDULE_COVERAGE_COMBINED_TILE_TITLE && scheduleCoverageRows != null;

  const showCostCoverageCombinedDetail =
    current?.title === COST_COVERAGE_COMBINED_TILE_TITLE && coverageRatioRows != null;

  const showNeedsAttentionDetail =
    current?.title === PORTFOLIO_HEALTH_KPI_TITLE && needsAttentionHealthRun != null;

  const slideBodyOverride = renderSlideBodyByIndex?.(safeIndex) ?? null;

  const showDetailShell =
    slideBodyOverride != null ||
    showProjectsList ||
    showActiveRisksDetail ||
    showPortfolioRagDetail ||
    showScheduleExposureDetail ||
    showNeedsAttentionDetail ||
    showCostCoverageCombinedDetail;

  const overlayScrimClass = "ds-modal-backdrop z-[100]";

  const overlay = (
    <div
      className={overlayScrimClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={DOCUMENT_KPI_MODAL_TITLE_ID}
      onClick={handleBackdropClick}
    >
      <div
        tabIndex={-1}
        className="w-full max-w-[70vw] max-h-[90vh] min-h-[400px] shrink-0 flex flex-col overflow-hidden outline-none rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 shrink-0 border-b border-[var(--ds-border)] px-4 sm:px-6 py-3">
          <h2
            id={DOCUMENT_KPI_MODAL_TITLE_ID}
            className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)] m-0 min-w-0 flex-1 truncate"
          >
            {current?.title ?? ""}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="p-2 rounded-[var(--ds-radius-sm)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)] transition-colors shrink-0"
            aria-label="Close"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <div
          className={
            showDetailShell
              ? "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col justify-start"
              : "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-8 flex flex-col justify-center"
          }
        >
          {current ? (
            slideBodyOverride != null ? (
              <div className="w-full min-w-0">{slideBodyOverride}</div>
            ) : showProjectsList && portfolioId != null && projectTilePayloads != null ? (
              <div className="w-full min-w-0">
                <PortfolioProjectsKpiModalBody
                  portfolioId={portfolioId}
                  projectTilePayloads={projectTilePayloads}
                />
              </div>
            ) : showActiveRisksDetail && activeRiskStatusSummaryRows != null ? (
              <div className="w-full min-w-0">
                <PortfolioActiveRisksKpiModalBody rows={activeRiskStatusSummaryRows} />
              </div>
            ) : showNeedsAttentionDetail && needsAttentionHealthRun != null ? (
              <div className="w-full min-w-0">
                <PortfolioNeedsAttentionKpiModalBody
                  health={needsAttentionHealthRun}
                  staleCopyMode={needsAttentionStaleCopyMode}
                />
              </div>
            ) : showCostCoverageCombinedDetail && coverageRatioRows != null ? (
              <div className="w-full min-w-0">
                <PortfolioCostCoverageCombinedKpiModalBody
                  rows={coverageRatioRows}
                  reportingUnit={reportingUnit}
                />
              </div>
            ) : showScheduleExposureDetail && scheduleCoverageRows != null ? (
              <div className="w-full min-w-0">
                <PortfolioScheduleCoverageCombinedKpiModalBody rows={scheduleCoverageRows} />
              </div>
            ) : showPortfolioRagDetail && projectTilePayloads != null ? (
              <div className="w-full min-w-0">
                <PortfolioRagKpiModalBody
                  projectTilePayloads={projectTilePayloads}
                  portfolioReportingFooter={portfolioReportingFooter ?? null}
                  reportingUnit={reportingUnit}
                />
              </div>
            ) : (
              <div className="max-w-xl mx-auto w-full text-center space-y-3">
                <p
                  className={`text-4xl sm:text-5xl font-semibold m-0 tracking-tight tabular-nums ${
                    current.primaryValueClassName != null && current.primaryValueClassName !== ""
                      ? current.primaryValueClassName
                      : "text-[var(--ds-text-primary)]"
                  }`}
                >
                  {current.primaryValue}
                </p>
                {current.subtext != null && current.subtext !== "" ? (
                  <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)] m-0">{current.subtext}</p>
                ) : null}
                {current.actionHref != null && current.actionHref !== "" ? (
                  <div className="pt-4">
                    <Link
                      href={current.actionHref}
                      className="inline-flex text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-primary)] underline-offset-4 hover:underline"
                    >
                      {current.actionLabel ?? "Open"}
                    </Link>
                  </div>
                ) : null}
              </div>
            )
          ) : null}
        </div>

        {tiles.length > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] w-full">
            <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] m-0 tabular-nums">
              {safeIndex + 1} / {tiles.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="md" onClick={goPrev} disabled={!canPrev} aria-label="Previous metric">
                Previous
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={goNext} disabled={!canNext} aria-label="Next metric">
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
