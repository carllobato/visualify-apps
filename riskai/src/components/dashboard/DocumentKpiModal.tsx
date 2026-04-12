"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectTile } from "@/components/dashboard/ProjectTile";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import {
  sortProjectTilesByRag,
  type PortfolioProjectCoverageRow,
  type PortfolioProjectRiskStatusRow,
  type PortfolioProjectScheduleCoverageRow,
  type PortfolioReportingFooterRow,
  type PortfolioRisksRequiringAttentionRow,
  type ProjectTilePayload,
  type RagStatus,
} from "@/lib/dashboard/projectTileServerData";
import { formatCurrencyCompact } from "@/lib/formatCurrency";
import { formatDurationDays } from "@/lib/formatDuration";
import { riskaiPath } from "@/lib/routes";
import {
  Badge,
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
  projectTilePayloads?: ProjectTilePayload[];
  /** Per-project lifecycle status counts for the Active Risks KPI modal. */
  activeRiskStatusSummaryRows?: PortfolioProjectRiskStatusRow[];
  /** Per-project contingency vs exposure for the Cost exposure & coverage KPI modal. */
  coverageRatioRows?: PortfolioProjectCoverageRow[];
  /** Per-project schedule exposure, contingency (weeks), and coverage — Total Schedule Exposure KPI modal. */
  scheduleCoverageRows?: PortfolioProjectScheduleCoverageRow[];
  /** Needs Attention KPI modal — high/extreme risks missing owner and/or mitigation text. */
  risksRequiringAttentionRows?: PortfolioRisksRequiringAttentionRow[];
  /** Portfolio Σ held vs Σ at-target-P row for Portfolio Risk Rating modal. */
  portfolioReportingFooter?: PortfolioReportingFooterRow | null;
  /**
   * When set, non-null return value replaces the default KPI body for that slide index (e.g. portfolio overview
   * slides 6–11 — Status through Top 5 Schedule). Return `null` to use the standard title-based KPI content.
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

/** Reporting line label (Cost / Time) — matches {@link formatReportingLineStatus} semantics. */
function reportingLineCellClass(label: string | undefined): string {
  const v = label?.trim() ?? "";
  if (v === "" || v === "—") return "text-[var(--ds-text-muted)] tabular-nums";
  if (v.startsWith("Off")) return "font-medium text-[var(--ds-status-danger-fg)] tabular-nums";
  if (v.startsWith("At risk")) return "font-medium text-[var(--ds-status-warning-fg)] tabular-nums";
  return "font-medium text-[var(--ds-status-success-fg)] tabular-nums";
}

function reportingOverallCellClass(label: string | undefined): string {
  const v = label?.trim() ?? "";
  if (v === "" || v === "—") return "text-[var(--ds-text-muted)]";
  if (v === "Off Track") return "font-semibold text-[var(--ds-status-danger-fg)]";
  if (v === "At Risk") return "font-semibold text-[var(--ds-status-warning-fg)]";
  if (v === "On Track") return "font-semibold text-[var(--ds-status-success-fg)]";
  return "font-medium text-[var(--ds-text-primary)]";
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
}: {
  projectTilePayloads: ProjectTilePayload[];
  portfolioReportingFooter: PortfolioReportingFooterRow | null;
}) {
  const router = useRouter();
  const rows = sortProjectTilesByRag([...projectTilePayloads]);

  const goToProject = (projectId: string) => {
    router.push(riskaiPath(`/projects/${projectId}`));
  };

  if (rows.length === 0) {
    return <p className="ds-kpi-modal-empty">No projects in this portfolio yet.</p>;
  }

  const anyReporting = rows.some((r) => r.reportingOverallStatus != null && r.reportingOverallStatus !== "");

  return (
    <>
      <p className="ds-kpi-modal-lead">
        {anyReporting ? (
          <>
            Cost, time, and overall status come from each project&apos;s <strong>last reporting run</strong> (locked
            snapshot) and current funding / schedule settings — the same percentile-vs-target bands as the simulation
            Overall position card. The portfolio RAG is the worst project rating (red over amber over green). Projects
            without a reporting run show “—” for those columns and use the legacy tile rule for RAG (residual severity and
            simulation activity).
            {portfolioReportingFooter != null ? (
              <>
                {" "}
                The <strong>Portfolio</strong> row sums contingency held versus simulated cost at target P (cost), and
                schedule contingency versus delay at target P (time), when all projects share one currency and reporting
                data supports it.
              </>
            ) : null}
          </>
        ) : (
          <>
            The portfolio rating is the most severe RAG among projects (red over amber over green). Each project without a
            reporting-locked run uses the legacy tile rules: high or extreme residual severity → Red; open risks with no
            simulation run → Amber; otherwise Green. Set a reporting run on the simulation page to see cost, time, and
            overall position here.
          </>
        )}
      </p>
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
            {rows.map((p) => (
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
                  <span className="block min-w-0 truncate font-medium text-[var(--ds-text-primary)]" title={p.name ?? p.id}>
                    {p.name?.trim() || p.id}
                  </span>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <span className={reportingLineCellClass(p.reportingCostStatus)}>{p.reportingCostStatus ?? "—"}</span>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <span className={reportingLineCellClass(p.reportingTimeStatus)}>{p.reportingTimeStatus ?? "—"}</span>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_OVERALL_CELL}>
                  <OverallRagCell overallLabel={p.reportingOverallStatus} rag={p.ragStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {portfolioReportingFooter != null ? (
            <tfoot className="border-t border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_65%,transparent)]">
              <TableRow>
                <TableHeaderCell
                  scope="row"
                  className={`${KPI_MODAL_REPORTING_PROJECT_COL} !text-left !normal-case tracking-normal text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]`}
                >
                  Portfolio
                </TableHeaderCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <span className={reportingLineCellClass(portfolioReportingFooter.costStatus)}>
                    {portfolioReportingFooter.costStatus}
                  </span>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_LINE_CELL}>
                  <span className={reportingLineCellClass(portfolioReportingFooter.timeStatus)}>
                    {portfolioReportingFooter.timeStatus}
                  </span>
                </TableCell>
                <TableCell className={KPI_MODAL_REPORTING_OVERALL_CELL}>
                  <OverallRagCell overallLabel={portfolioReportingFooter.overallStatus} rag={portfolioReportingFooter.rag} />
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
  return (
    <>
      <p className="m-0 mb-6 w-full max-w-none text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
        Open a project for its overview, risk register, and simulation. Create a new project to add it to this
        portfolio.
      </p>

      {projectTilePayloads.length === 0 ? (
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
      )}
    </>
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
    <>
      <p className="ds-kpi-modal-lead">
        Risk counts by lifecycle status per project. The “Closed / archived” column combines closed and archived register
        statuses.
      </p>
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
    </>
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

const RATING_BADGE_CIRCLE =
  "!inline-flex !h-7 !w-7 !min-h-[1.75rem] !min-w-[1.75rem] !rounded-full !p-0 items-center justify-center text-[length:var(--ds-text-xs)]";

type DsBadgeTone = {
  status: "neutral" | "success" | "warning" | "danger" | "info";
  variant: "subtle" | "strong";
};

function ratingLetterToBadgeTone(letter: "L" | "M" | "H" | "E"): DsBadgeTone {
  switch (letter) {
    case "L":
      return { status: "success", variant: "subtle" };
    case "M":
      return { status: "warning", variant: "subtle" };
    case "H":
      return { status: "danger", variant: "subtle" };
    case "E":
      return { status: "danger", variant: "strong" };
  }
}

function badgeToneForRatingLetter(letter: string): DsBadgeTone {
  if (letter === "N/A") return { status: "neutral", variant: "subtle" };
  if (letter === "L" || letter === "M" || letter === "H" || letter === "E") {
    return ratingLetterToBadgeTone(letter);
  }
  return { status: "neutral", variant: "subtle" };
}

/** Portfolio overview combined financial KPI — must match `kpiTiles` title in `PortfolioOverviewContent`. */
export const COST_COVERAGE_COMBINED_TILE_TITLE = "Cost exposure & coverage";

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
    <>
      <p className="ds-kpi-modal-lead">
        Per project: <strong>Schedule exposure</strong> is the sum of expected schedule impact (probability ×
        lifecycle-appropriate schedule days) for active time-applicable risks — same basis as the schedule donut and Top 5
        schedule risks. <strong>Contingency</strong> is schedule reserve weeks from project settings.{" "}
        <strong>Coverage</strong> is contingency ÷ schedule exposure; above 100% means held contingency exceeds modelled
        delay. The <strong>Portfolio</strong> row sums schedule exposure and contingency across all projects.
      </p>
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
    </>
  );
}

function PortfolioNeedsAttentionKpiModalBody({ rows }: { rows: PortfolioRisksRequiringAttentionRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <p className="ds-kpi-modal-empty">
        No active risks rated High or Extreme are missing an owner or a mitigation description.
      </p>
    );
  }

  const goToRiskDetail = (projectId: string, riskId: string) => {
    const q = new URLSearchParams({ openRiskId: riskId });
    router.push(riskaiPath(`/projects/${projectId}/risks?${q.toString()}`));
  };

  const goToRegister = (projectId: string) => {
    router.push(riskaiPath(`/projects/${projectId}/risks`));
  };

  return (
    <>
      <p className="ds-kpi-modal-lead">
        Residual severity High or Extreme (from post-mitigation probability and consequence), where the risk has no owner
        and/or no mitigation description. Assign an owner and document mitigation in the risk register.
      </p>
      <Card className="overflow-x-auto overflow-y-hidden border-[var(--ds-border-subtle)] p-0">
        <Table className={`${KPI_MODAL_REGISTER_TABLE_CLASS} min-w-[40rem]`}>
          <caption className="sr-only">Risks requiring attention</caption>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="align-middle">Project</TableHeaderCell>
              <TableHeaderCell className="align-middle">Risk</TableHeaderCell>
              <TableHeaderCell className="align-middle w-[5.25rem]">Rating</TableHeaderCell>
              <TableHeaderCell className="align-middle">Owner</TableHeaderCell>
              <TableHeaderCell className="align-middle min-w-[12rem]">Issue</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const ratingTone = badgeToneForRatingLetter(r.rating);
              return (
                <TableRow
                  key={r.riskId}
                  className="cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]"
                  tabIndex={0}
                  role="button"
                  aria-label={`Open risk ${r.riskTitle}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-portfolio-attention-project-link]")) return;
                    goToRiskDetail(r.projectId, r.riskId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if ((e.target as HTMLElement).closest("[data-portfolio-attention-project-link]")) return;
                      goToRiskDetail(r.projectId, r.riskId);
                    }
                  }}
                >
                  <TableCell className="min-w-0 max-w-[14rem] align-middle">
                    <button
                      type="button"
                      data-portfolio-attention-project-link
                      className="block min-w-0 max-w-full cursor-pointer truncate bg-transparent p-0 text-left font-medium text-[var(--ds-text-primary)] underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]"
                      title={r.projectName}
                      aria-label={`Open risk register for ${r.projectName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToRegister(r.projectId);
                      }}
                    >
                      {r.projectName}
                    </button>
                  </TableCell>
                  <TableCell className="min-w-0 align-middle">
                    <span className="block min-w-0 truncate text-[var(--ds-text-secondary)]" title={r.riskTitle}>
                      {r.riskTitle}
                    </span>
                  </TableCell>
                  <TableCell className="w-[5.25rem] max-w-[5.25rem] shrink-0 overflow-hidden align-middle px-2">
                    <span title={r.rating === "N/A" ? "Rating: N/A" : `Rating: ${r.rating}`}>
                      <Badge status={ratingTone.status} variant={ratingTone.variant} className={RATING_BADGE_CIRCLE}>
                        {r.rating}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell className="min-w-0 max-w-[10rem] align-middle text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    <span className="block truncate" title={r.ownerDisplay}>
                      {r.ownerDisplay}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-0 align-middle text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                    {r.issueLabel}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function PortfolioCostCoverageCombinedKpiModalBody({ rows }: { rows: PortfolioProjectCoverageRow[] }) {
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
    <>
      <p className="ds-kpi-modal-lead">
        Per project: <strong>Risk exposure</strong> is the sum of 12-month forward cost exposure from active cost risks
        (same engine as the donut). <strong>Contingency</strong> is from project settings. <strong>Coverage</strong> is
        contingency ÷ risk exposure; above 100% means held contingency exceeds modelled exposure. The cost donut mixes
        currencies numerically when projects differ — this table keeps each amount in its own currency. Portfolio totals
        sum only when every project shares one currency.
      </p>
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
                  {r.exposureAmountAbs > 0 ? formatCurrencyCompact(r.exposureAmountAbs, r.currency) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums align-middle text-[var(--ds-text-primary)]">
                  {formatCurrencyCompact(r.contingencyAmountAbs, r.currency)}
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
                  ? formatCurrencyCompact(totalExposureAbs, singleCurrency)
                  : "—"}
              </TableCell>
              <TableCell
                className="text-right tabular-nums align-middle font-semibold text-[var(--ds-text-primary)]"
                title={singleCurrency == null ? "Multiple currencies — not summed" : undefined}
              >
                {singleCurrency != null && totalContingencyAbs != null
                  ? formatCurrencyCompact(totalContingencyAbs, singleCurrency)
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
    </>
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
  projectTilePayloads,
  portfolioReportingFooter,
  activeRiskStatusSummaryRows,
  coverageRatioRows,
  scheduleCoverageRows,
  risksRequiringAttentionRows,
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
    current?.title === "Projects" &&
    portfolioId != null &&
    portfolioId !== "" &&
    projectTilePayloads != null;

  const showActiveRisksDetail = current?.title === "Active Risks" && activeRiskStatusSummaryRows != null;

  const showPortfolioRagDetail = current?.title === "Portfolio Risk Rating" && projectTilePayloads != null;

  const showScheduleExposureDetail = current?.title === "Total Schedule Exposure" && scheduleCoverageRows != null;

  const showCostCoverageCombinedDetail =
    current?.title === COST_COVERAGE_COMBINED_TILE_TITLE && coverageRatioRows != null;

  const showNeedsAttentionDetail = current?.title === "Needs Attention" && risksRequiringAttentionRows != null;

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
            ) : showNeedsAttentionDetail && risksRequiringAttentionRows != null ? (
              <div className="w-full min-w-0">
                <PortfolioNeedsAttentionKpiModalBody rows={risksRequiringAttentionRows} />
              </div>
            ) : showCostCoverageCombinedDetail && coverageRatioRows != null ? (
              <div className="w-full min-w-0">
                <PortfolioCostCoverageCombinedKpiModalBody rows={coverageRatioRows} />
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
