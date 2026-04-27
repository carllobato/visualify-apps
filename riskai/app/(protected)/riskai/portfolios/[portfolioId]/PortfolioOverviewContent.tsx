"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@visualify/design-system";
import {
  COST_COVERAGE_COMBINED_TILE_TITLE,
  DocumentKpiModal,
  PORTFOLIO_ACTIVE_PROJECTS_KPI_TITLE,
  PORTFOLIO_HEALTH_KPI_TITLE,
  SCHEDULE_COVERAGE_COMBINED_TILE_TITLE,
  type DocumentKpiTileItem,
} from "@/components/dashboard/DocumentKpiModal";
import { PortfolioCostCoverageMetricsPanel } from "@/components/dashboard/PortfolioCostCoverageMetricsPanel";
import { PortfolioScheduleExposureMetricsPanel } from "@/components/dashboard/PortfolioScheduleExposureMetricsPanel";
import { SummaryTile } from "@/components/dashboard/SummaryTile";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { FirstProjectPromptModal } from "@/components/onboarding/FirstProjectPromptModal";
import { dispatchOpenProjectOnboarding } from "@/components/onboarding/OpenProjectOnboardingLink";
import { PortfolioExposureByProjectDonut } from "@/components/dashboard/PortfolioExposureByProjectDonut";
import {
  PortfolioCategoryBreakdownTrigger,
  PortfolioRiskCategoryCountsTable,
} from "@/components/dashboard/PortfolioRiskCategoryCountsTable";
import { PortfolioRiskSeverityCountsTable } from "@/components/dashboard/PortfolioRiskSeverityCountsTable";
import { PortfolioTopRisksTable } from "@/components/dashboard/PortfolioTopRisksTable";
import { PortfolioRiskStatusCountsTable } from "@/components/dashboard/PortfolioRiskStatusCountsTable";
import {
  PortfolioOwnerBreakdownTrigger,
  PortfolioRiskOwnerCountsTable,
} from "@/components/dashboard/PortfolioRiskOwnerCountsTable";
import type {
  PortfolioNeedsAttentionHealthRun,
  PortfolioProjectCostExposureSlice,
  PortfolioProjectCoverageRow,
  PortfolioProjectRiskSeverityRow,
  PortfolioProjectRiskStatusRow,
  PortfolioProjectScheduleCoverageRow,
  PortfolioProjectScheduleExposureSlice,
  PortfolioReportingFooterRow,
  PortfolioRiskCategoryCount,
  PortfolioRiskOwnerCount,
  PortfolioRiskStatusCount,
  PortfolioTopRiskRow,
  ProjectTilePayload,
  RagStatus,
} from "@/lib/dashboard/projectTileServerData";
import type { ReportingUnitOption } from "@/lib/portfolio/reportingPreferences";
import type { NeedsAttentionStaleCopyMode } from "@/lib/dashboard/needsAttentionHealthRun";
import type { PortfolioOverviewReportingTrendSet } from "@/lib/dashboard/portfolioOverviewReportingTrends";
import { riskaiPath } from "@/lib/routes";

/** Screen-reader caption for Top 5 Cost Risks (combined register forward exposure and simulation delay-commercial rows). */
function topFiveCostRisksTableCaption(reportingMonthLabel: string | null): string {
  if (reportingMonthLabel != null) {
    return "For the selected reporting month: top five cost drivers ranked by modeled dollars combine per-risk forward exposure from the register with delay-related commercial impact from the reporting simulation when material.";
  }
  return "Top five cost drivers ranked by modeled dollars combine per-risk forward exposure from the register with delay-related commercial impact from the reporting simulation when material.";
}

type PortfolioBreakdownModalId =
  | "status"
  | "severity"
  | "category"
  | "owner"
  | "topCost"
  | "topSchedule"
  | "topCostOpportunity"
  | "topScheduleOpportunity";

const PORTFOLIO_BREAKDOWN_MODAL_TITLES: Record<PortfolioBreakdownModalId, string> = {
  status: "Status",
  severity: "Severity",
  category: "Category",
  owner: "Owner",
  topCost: "Top 5 Cost Risks",
  topSchedule: "Top 5 Schedule Risks",
  topCostOpportunity: "Top 5 Cost Opportunities",
  topScheduleOpportunity: "Top 5 Schedule Opportunities",
};

const primaryLinkButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-primary)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] transition-all duration-150 ease-out hover:bg-[var(--ds-primary-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] active:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

const secondaryLinkButtonClass =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-button-secondary)] transition-all duration-150 ease-out hover:bg-[var(--ds-surface-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

/** Fixed order for portfolio overview cards 6–13 — same order as {@link DocumentKpiModal} Previous / Next. */
const PORTFOLIO_BREAKDOWN_MODAL_CYCLE: PortfolioBreakdownModalId[] = [
  "status",
  "severity",
  "category",
  "owner",
  "topCost",
  "topSchedule",
  "topCostOpportunity",
  "topScheduleOpportunity",
];

function portfolioRagTileCopy(
  rag: RagStatus | null,
  reportingMonthLabel: string | null
): { primary: string; subtext: string; primaryValueClassName?: string; primaryRagDot?: RagStatus } {
  if (rag == null) {
    return { primary: "—", subtext: "No projects yet" };
  }
  const subtext =
    reportingMonthLabel != null
      ? `Aggregated risk across projects with a locked run for ${reportingMonthLabel}`
      : "Aggregated risk across all projects";
  const primary = rag === "red" ? "Red" : rag === "amber" ? "Amber" : "Green";
  const primaryValueClassName =
    rag === "red"
      ? "text-[var(--ds-status-danger)]"
      : rag === "amber"
        ? "text-[var(--ds-status-warning)]"
        : "text-[var(--ds-status-success)]";
  return { primary, subtext, primaryValueClassName, primaryRagDot: rag };
}

/** Same overall label + colours as the Portfolio row in the KPI modal (`OverallRagCell`). */
function portfolioReportingFooterTileCopy(
  footer: PortfolioReportingFooterRow,
  reportingMonthLabel: string | null
): {
  primary: string;
  subtext: string;
  primaryValueClassName?: string;
  primaryRagDot: RagStatus;
} {
  const v = footer.overallStatus.trim();
  const primaryValueClassName =
    v === "Off Track"
      ? "font-semibold text-[var(--ds-status-danger-fg)]"
      : v === "At Risk"
        ? "font-semibold text-[var(--ds-status-warning-fg)]"
        : v === "On Track"
          ? "font-semibold text-[var(--ds-status-success-fg)]"
          : "font-medium text-[var(--ds-text-primary)]";
  return {
    primary: v !== "" && v !== "—" ? v : "—",
    subtext:
      reportingMonthLabel != null
        ? "Aggregated portfolio position"
        : "Aggregated risk across all projects",
    primaryValueClassName,
    primaryRagDot: footer.rag,
  };
}

/** Controlled breakdown so category + owner “Show All” stay in sync (does not re-render donut charts). */
function PortfolioRiskByCategoryCard({
  riskCategoryCounts,
  breakdownOpen,
  onBreakdownToggle,
  onActivate,
  modalSelected,
  activateAriaLabel,
}: {
  riskCategoryCounts: PortfolioRiskCategoryCount[];
  breakdownOpen: boolean;
  onBreakdownToggle: () => void;
  onActivate?: () => void;
  modalSelected?: boolean;
  activateAriaLabel?: string;
}) {
  const showCategoryBreakdownTrigger = riskCategoryCounts.length > 5;

  return (
    <DashboardCard
      title="Category"
      headerActions={
        showCategoryBreakdownTrigger ? (
          <PortfolioCategoryBreakdownTrigger open={breakdownOpen} onToggle={onBreakdownToggle} />
        ) : null
      }
      onActivate={onActivate}
      modalSelected={modalSelected}
      activateAriaLabel={activateAriaLabel}
    >
      <PortfolioRiskCategoryCountsTable rows={riskCategoryCounts} breakdownOpen={breakdownOpen} />
    </DashboardCard>
  );
}

function PortfolioRiskByOwnerCard({
  riskOwnerCounts,
  breakdownOpen,
  onBreakdownToggle,
  onActivate,
  modalSelected,
  activateAriaLabel,
}: {
  riskOwnerCounts: PortfolioRiskOwnerCount[];
  breakdownOpen: boolean;
  onBreakdownToggle: () => void;
  onActivate?: () => void;
  modalSelected?: boolean;
  activateAriaLabel?: string;
}) {
  const showOwnerBreakdownTrigger = riskOwnerCounts.length > 5;

  return (
    <DashboardCard
      title="Owner"
      headerActions={
        showOwnerBreakdownTrigger ? (
          <PortfolioOwnerBreakdownTrigger open={breakdownOpen} onToggle={onBreakdownToggle} />
        ) : null
      }
      onActivate={onActivate}
      modalSelected={modalSelected}
      activateAriaLabel={activateAriaLabel}
    >
      <PortfolioRiskOwnerCountsTable rows={riskOwnerCounts} breakdownOpen={breakdownOpen} />
    </DashboardCard>
  );
}

type PortfolioOverviewContentProps = {
  portfolioId: string;
  reportingUnit: ReportingUnitOption;
  /** Human label for the selected reporting month (e.g. “March 2026”); `null` when viewing latest / unscoped. */
  reportingMonthLabel: string | null;
  projectCount: number;
  activeRiskCount: number;
  contingencyPrimaryValue: string;
  costExposurePrimaryValue: string;
  /** Subtext from `costExposureTileCopy` (same basis as the cost exposure figure). */
  costExposureSubtext: string;
  scheduleExposurePrimaryValue: string;
  scheduleExposureSubtext: string;
  scheduleContingencyHeldPrimaryValue: string;
  scheduleCoverageRatioPrimaryValue: string;
  scheduleCoverageRatioPrimaryRagDot?: RagStatus;
  scheduleCoverageRatioSemanticClassName?: string;
  needsAttentionPrimaryValue: string;
  needsAttentionSubtext: string;
  needsAttentionPrimaryValueClassName?: string;
  needsAttentionPrimaryRagDot: RagStatus;
  /** Formatted coverage ratio (contingency ÷ forward cost exposure). */
  coveragePrimaryValue: string;
  coveragePrimaryRagDot?: RagStatus;
  /** Optional semantic colour for the coverage % in the combined cost KPI tile. */
  coverageRatioSemanticClassName?: string;
  /** Worst project RAG across the portfolio (`null` when there are no projects). */
  portfolioRag: RagStatus | null;
  /** Same payloads as `/portfolios/:id/projects` — used in the Active Projects KPI modal. */
  projectTilePayloads: ProjectTilePayload[];
  /** Portfolio aggregate row for Portfolio Risk Rating modal (Σ held vs Σ at-target-P when single currency). */
  portfolioReportingFooter: PortfolioReportingFooterRow | null;
  /** Per-project register-aligned severity counts — Severity card. */
  activeRiskSummaryRows: PortfolioProjectRiskSeverityRow[];
  /** Per-project lifecycle status counts — Active Risks KPI modal. */
  activeRiskStatusSummaryRows: PortfolioProjectRiskStatusRow[];
  /** Per-project risk exposure, contingency, and coverage — Cost Exposure & Coverage KPI modal. */
  coverageRatioRows: PortfolioProjectCoverageRow[];
  /** Top cost risks by forward exposure — risk concentration tables. */
  topCostRiskRows: PortfolioTopRiskRow[];
  /** Top schedule risks by expected delay — risk concentration tables. */
  topScheduleRiskRows: PortfolioTopRiskRow[];
  /** Largest pre − forward cost deltas (derived opportunities). */
  topCostOpportunityRows: PortfolioTopRiskRow[];
  /** Largest pre − expected delay deltas (derived opportunities). */
  topScheduleOpportunityRows: PortfolioTopRiskRow[];
  /** Per-project forward cost exposure shares — exposure-by-project donut. */
  projectCostExposureSlices: PortfolioProjectCostExposureSlice[];
  /** Per-project schedule exposure (expected days) shares — exposure-by-project donut. */
  projectScheduleExposureSlices: PortfolioProjectScheduleExposureSlice[];
  /** Per-project schedule exposure, contingency (working days), and coverage — Schedule Exposure & Coverage KPI modal. */
  scheduleCoverageRows: PortfolioProjectScheduleCoverageRow[];
  /** Active risks grouped by category — risks-by-category bars. */
  riskCategoryCounts: PortfolioRiskCategoryCount[];
  /** Risks by lifecycle bucket (Open / Monitoring / Mitigating / Closed) — risks-by-status bars. */
  riskStatusCounts: PortfolioRiskStatusCount[];
  /** Active risks by owner text — risks-by-owner bars. */
  riskOwnerCounts: PortfolioRiskOwnerCount[];
  /** Composite health run (tile figure + modal score card). */
  needsAttentionHealthRun: PortfolioNeedsAttentionHealthRun;
  /** Month-over-month vs calendar prior reporting month; `null` when no comparable prior snapshot. */
  reportingVsPriorMonthTrends: PortfolioOverviewReportingTrendSet | null;
};

export function PortfolioOverviewContent({
  portfolioId,
  reportingUnit,
  reportingMonthLabel,
  projectCount,
  activeRiskCount,
  contingencyPrimaryValue,
  costExposurePrimaryValue,
  costExposureSubtext,
  scheduleExposurePrimaryValue,
  scheduleExposureSubtext,
  scheduleContingencyHeldPrimaryValue,
  scheduleCoverageRatioPrimaryValue,
  scheduleCoverageRatioPrimaryRagDot,
  scheduleCoverageRatioSemanticClassName,
  needsAttentionPrimaryValue,
  needsAttentionSubtext,
  needsAttentionPrimaryValueClassName,
  needsAttentionPrimaryRagDot,
  coveragePrimaryValue,
  coveragePrimaryRagDot,
  coverageRatioSemanticClassName,
  portfolioRag,
  projectTilePayloads,
  portfolioReportingFooter,
  activeRiskSummaryRows,
  activeRiskStatusSummaryRows,
  coverageRatioRows,
  topCostRiskRows,
  topScheduleRiskRows,
  topCostOpportunityRows,
  topScheduleOpportunityRows,
  projectCostExposureSlices,
  projectScheduleExposureSlices,
  scheduleCoverageRows,
  riskCategoryCounts,
  riskStatusCounts,
  riskOwnerCounts,
  needsAttentionHealthRun,
  reportingVsPriorMonthTrends,
}: PortfolioOverviewContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFirstProjectPrompt, setShowFirstProjectPrompt] = useState(false);
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [overviewModalIndex, setOverviewModalIndex] = useState(0);
  /** Linked “Show All” for Category + Owner bar charts. */
  const [categoryOwnerBreakdownOpen, setCategoryOwnerBreakdownOpen] = useState(false);
  const toggleCategoryOwnerBreakdown = useCallback(() => {
    setCategoryOwnerBreakdownOpen((o) => !o);
  }, []);

  const needsAttentionStaleCopyMode: NeedsAttentionStaleCopyMode =
    reportingMonthLabel != null ? "reportingMonthLock" : "utcMonthSnapshot";

  const kpiTiles = useMemo((): DocumentKpiTileItem[] => {
    const projectsSubtext =
      reportingMonthLabel != null
        ? "Projects within current report"
        : "Under this portfolio: only projects with a locked monthly reporting snapshot (saved run). Others are omitted from this view.";
    const risksSubtext = "Open, monitoring, or mitigating risks";
    const rag =
      portfolioReportingFooter != null
        ? portfolioReportingFooterTileCopy(portfolioReportingFooter, reportingMonthLabel)
        : portfolioRagTileCopy(portfolioRag, reportingMonthLabel);
    return [
      {
        title: "Portfolio Risk Rating",
        primaryValue: rag.primary,
        primaryValueClassName: rag.primaryValueClassName,
        primaryRagDot: rag.primaryRagDot,
        subtext: rag.subtext,
      },
      {
        title: PORTFOLIO_ACTIVE_PROJECTS_KPI_TITLE,
        primaryValue: String(projectCount),
        subtext: projectsSubtext,
        actionHref: riskaiPath(`/portfolios/${portfolioId}/projects`),
        actionLabel: "View projects",
      },
      {
        title: "Active Risks",
        primaryValue: String(activeRiskCount),
        subtext: risksSubtext,
      },
      {
        title: PORTFOLIO_HEALTH_KPI_TITLE,
        primaryValue: needsAttentionPrimaryValue,
        primaryValueClassName: needsAttentionPrimaryValueClassName,
        primaryRagDot: needsAttentionPrimaryRagDot,
        subtext: needsAttentionSubtext,
      },
      {
        title: COST_COVERAGE_COMBINED_TILE_TITLE,
        primaryValue: coveragePrimaryValue,
        primaryValueClassName: coverageRatioSemanticClassName,
        subtext: `${costExposurePrimaryValue} exposure · ${contingencyPrimaryValue} held`,
      },
      {
        title: SCHEDULE_COVERAGE_COMBINED_TILE_TITLE,
        primaryValue: scheduleExposurePrimaryValue,
        subtext: scheduleExposureSubtext,
      },
    ];
  }, [
    portfolioId,
    projectCount,
    activeRiskCount,
    portfolioRag,
    portfolioReportingFooter,
    reportingMonthLabel,
    projectTilePayloads.length,
    contingencyPrimaryValue,
    costExposurePrimaryValue,
    scheduleExposurePrimaryValue,
    scheduleExposureSubtext,
    needsAttentionPrimaryValue,
    needsAttentionSubtext,
    needsAttentionPrimaryValueClassName,
    needsAttentionPrimaryRagDot,
    coveragePrimaryValue,
    coverageRatioSemanticClassName,
  ]);

  /** Fourteen slides: KPI summary (0–3), cost + schedule exposure cards (4–5), then Status through opportunity tables (6–13). */
  const overviewTiles = useMemo((): DocumentKpiTileItem[] => {
    const breakdownTiles: DocumentKpiTileItem[] = PORTFOLIO_BREAKDOWN_MODAL_CYCLE.map((id) => ({
      title: PORTFOLIO_BREAKDOWN_MODAL_TITLES[id],
      primaryValue: "—",
    }));
    return [...kpiTiles, ...breakdownTiles];
  }, [kpiTiles]);

  const openOverviewAt = useCallback((index: number) => {
    setOverviewModalIndex(index);
    setOverviewModalOpen(true);
  }, []);

  const renderPortfolioOverviewSlideBody = useCallback(
    (slideIndex: number) => {
      if (slideIndex < 6) return null;
      switch (slideIndex) {
        case 6:
          return <PortfolioRiskStatusCountsTable rows={riskStatusCounts} />;
        case 7:
          return <PortfolioRiskSeverityCountsTable activeRiskSummaryRows={activeRiskSummaryRows} />;
        case 8:
          return (
            <PortfolioRiskCategoryCountsTable
              rows={riskCategoryCounts}
              breakdownOpen={categoryOwnerBreakdownOpen}
              showAllRows
            />
          );
        case 9:
          return (
            <PortfolioRiskOwnerCountsTable
              rows={riskOwnerCounts}
              breakdownOpen={categoryOwnerBreakdownOpen}
              showAllRows
            />
          );
        case 10:
          return (
            <PortfolioTopRisksTable
              rows={topCostRiskRows}
              caption={topFiveCostRisksTableCaption(reportingMonthLabel)}
              emptyMessage="No cost risk data available. Add cost-applicable risks with positive cost impacts in your projects to populate this view."
              showOwnerColumn
            />
          );
        case 11:
          return (
            <PortfolioTopRisksTable
              rows={topScheduleRiskRows}
              caption={
                reportingMonthLabel != null
                  ? "Top five portfolio schedule risks by expected delay (current register)"
                  : "Top five portfolio schedule risks by expected delay"
              }
              emptyMessage="No schedule risk data available. Add time-applicable risks with positive schedule impacts in your projects to populate this view."
              showOwnerColumn
            />
          );
        case 12:
          return (
            <PortfolioTopRisksTable
              rows={topCostOpportunityRows}
              caption="Top five portfolio cost opportunities from planned mitigation on monitoring risks"
              emptyMessage="No cost opportunities in this portfolio yet. Opportunities appear for Monitoring risks with mitigation plans and post-mitigation values, where the planned post-mitigation expected cost is lower than the pre-mitigation expected cost."
              primaryMetricLabel="Opportunity"
              showOwnerColumn
            />
          );
        case 13:
          return (
            <PortfolioTopRisksTable
              rows={topScheduleOpportunityRows}
              caption="Top five portfolio schedule opportunities from planned mitigation on monitoring risks"
              emptyMessage="No schedule opportunities in this portfolio yet. Opportunities appear for Monitoring risks with mitigation plans and post-mitigation values, where the planned post-mitigation expected delay is lower than the pre-mitigation expected delay."
              primaryMetricLabel="Opportunity"
              showOwnerColumn
            />
          );
        default:
          return null;
      }
    },
    [
      riskStatusCounts,
      activeRiskSummaryRows,
      riskCategoryCounts,
      riskOwnerCounts,
      categoryOwnerBreakdownOpen,
      topCostRiskRows,
      topScheduleRiskRows,
      topCostOpportunityRows,
      topScheduleOpportunityRows,
      reportingMonthLabel,
    ]
  );

  useEffect(() => {
    const shouldPrompt =
      projectCount === 0 && searchParams.get("onboarding_first_project") === "1";
    setShowFirstProjectPrompt(shouldPrompt);
  }, [projectCount, searchParams]);

  const clearFirstProjectQueryParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("onboarding_first_project");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  const onDismissFirstProjectPrompt = useCallback(() => {
    setShowFirstProjectPrompt(false);
    clearFirstProjectQueryParam();
  }, [clearFirstProjectQueryParam]);

  const onStartFirstProjectOnboarding = useCallback(() => {
    setShowFirstProjectPrompt(false);
    clearFirstProjectQueryParam();
    dispatchOpenProjectOnboarding(portfolioId);
  }, [clearFirstProjectQueryParam, portfolioId]);

  const kpiSummaryTrendSlots = [
    reportingVsPriorMonthTrends?.portfolioRiskRating ?? null,
    reportingVsPriorMonthTrends?.activeProjects ?? null,
    reportingVsPriorMonthTrends?.activeRisks ?? null,
    reportingVsPriorMonthTrends?.needsAttention ?? null,
  ];

  const hasReportableData = projectTilePayloads.length > 0;

  if (!hasReportableData) {
    return (
      <main className="ds-document-page">
        <section aria-labelledby="portfolio-overview-empty-heading">
          <Card variant="inset" className="mx-auto max-w-2xl border-0 text-center">
            <CardBody className="py-[var(--ds-space-6)]">
              <p id="portfolio-overview-empty-heading" className="ds-dashboard-empty-title">
                Portfolio overview will appear once reporting data is available
              </p>
              <p className="mx-auto mt-2 max-w-xl text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
                Run and lock monthly reporting for at least one project to populate portfolio risk
                rating, exposure, health, drivers, and breakdowns.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={riskaiPath(`/portfolios/${portfolioId}/projects`)}
                  className={primaryLinkButtonClass}
                >
                  Go to Projects
                </Link>
                <Link
                  href={riskaiPath(`/portfolios/${portfolioId}/portfolio-settings`)}
                  className={secondaryLinkButtonClass}
                >
                  Portfolio Settings
                </Link>
              </div>
            </CardBody>
          </Card>
        </section>
        <FirstProjectPromptModal
          open={showFirstProjectPrompt}
          onStartProjectOnboarding={onStartFirstProjectOnboarding}
          onDismiss={onDismissFirstProjectPrompt}
        />
      </main>
    );
  }

  return (
    <main className="ds-document-page">
      {/* Section A — Portfolio KPI Summary */}
      <section className="mb-8" aria-labelledby="portfolio-kpi-heading">
        <h2 id="portfolio-kpi-heading" className="sr-only">
          Portfolio KPI summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiTiles.slice(0, 4).map((tile, i) => {
            const trendSlot = kpiSummaryTrendSlots[i];
            return (
              <SummaryTile
                key={tile.title}
                title={tile.title}
                primaryValue={tile.primaryValue}
                primaryValueClassName={tile.primaryValueClassName}
                primaryRagDot={tile.primaryRagDot}
                trend={trendSlot != null ? { text: trendSlot.text, className: trendSlot.className } : undefined}
                subtext={tile.subtext}
                onActivate={() => openOverviewAt(i)}
                selected={overviewModalOpen && overviewModalIndex === i}
              />
            );
          })}
        </div>
      </section>

      {/* Section B — Exposure by project + risk breakdown (donuts, then lifecycle status → severity → category → owner) */}
      <section className="mb-8 flex flex-col gap-4 lg:gap-6" aria-labelledby="portfolio-exposure-by-project-heading">
        <h2 id="portfolio-exposure-by-project-heading" className="sr-only">
          Portfolio cost and schedule exposure
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          <DashboardCard
            title="Cost Exposure &amp; Coverage"
            onActivate={() => openOverviewAt(4)}
            modalSelected={overviewModalOpen && overviewModalIndex === 4}
            activateAriaLabel="Open cost exposure, contingency, and coverage details"
          >
            <div className="flex flex-col gap-3">
              {costExposureSubtext.trim() !== "" ? (
                <p className="m-0 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-muted)]">
                  {costExposureSubtext}
                </p>
              ) : null}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
                <div className="min-w-0 flex-1 flex flex-col">
                  <PortfolioExposureByProjectDonut
                    mode="cost"
                    slices={projectCostExposureSlices}
                    reportingUnit={reportingUnit}
                  />
                </div>
                <aside className="w-full shrink-0 border-t border-[var(--ds-border-subtle)] pt-4 lg:flex lg:w-auto lg:min-h-0 lg:min-w-[11rem] lg:max-w-[15rem] lg:flex-col lg:justify-center lg:border-t-0 lg:border-l lg:border-[var(--ds-border-subtle)] lg:pl-6 lg:pt-0">
                  <div className="w-full rounded-[var(--ds-radius-sm)] border border-transparent p-2 -m-2 text-left">
                    <PortfolioCostCoverageMetricsPanel
                      layout="stack"
                      compact
                      costExposurePrimaryValue={costExposurePrimaryValue}
                      contingencyPrimaryValue={contingencyPrimaryValue}
                      coveragePrimaryValue={coveragePrimaryValue}
                      coveragePrimaryRagDot={coveragePrimaryRagDot}
                      coveragePrimaryValueClassName={coverageRatioSemanticClassName}
                      costExposureTrend={reportingVsPriorMonthTrends?.costCoverageSidebarMoM?.costExposure}
                      contingencyTrend={reportingVsPriorMonthTrends?.costCoverageSidebarMoM?.contingency}
                      coverageRatioTrend={reportingVsPriorMonthTrends?.costCoverageSidebarMoM?.coverageRatio}
                    />
                  </div>
                </aside>
              </div>
            </div>
          </DashboardCard>
          <DashboardCard
            title="Schedule Exposure &amp; Coverage"
            onActivate={() => openOverviewAt(5)}
            modalSelected={overviewModalOpen && overviewModalIndex === 5}
            activateAriaLabel="Open schedule exposure and coverage details"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
              <div className="min-w-0 flex-1 flex flex-col">
                <PortfolioExposureByProjectDonut mode="schedule" slices={projectScheduleExposureSlices} />
              </div>
              <aside className="w-full shrink-0 border-t border-[var(--ds-border-subtle)] pt-4 lg:flex lg:w-auto lg:min-h-0 lg:min-w-[11rem] lg:max-w-[15rem] lg:flex-col lg:justify-center lg:border-t-0 lg:border-l lg:border-[var(--ds-border-subtle)] lg:pl-6 lg:pt-0">
                <div className="w-full rounded-[var(--ds-radius-sm)] border border-transparent p-2 -m-2 text-left">
                  <PortfolioScheduleExposureMetricsPanel
                    layout="stack"
                    compact
                    scheduleExposurePrimaryValue={scheduleExposurePrimaryValue}
                    scheduleContingencyHeldPrimaryValue={scheduleContingencyHeldPrimaryValue}
                    scheduleCoverageRatioPrimaryValue={scheduleCoverageRatioPrimaryValue}
                    scheduleCoverageRatioPrimaryRagDot={scheduleCoverageRatioPrimaryRagDot}
                    scheduleCoverageRatioPrimaryValueClassName={scheduleCoverageRatioSemanticClassName}
                    scheduleExposureTrend={reportingVsPriorMonthTrends?.scheduleCoverageSidebarMoM?.scheduleExposure}
                    scheduleContingencyWorkingDaysTrend={
                      reportingVsPriorMonthTrends?.scheduleCoverageSidebarMoM?.scheduleContingencyWorkingDays
                    }
                    scheduleCoverageRatioTrend={
                      reportingVsPriorMonthTrends?.scheduleCoverageSidebarMoM?.scheduleCoverageRatio
                    }
                  />
                </div>
              </aside>
            </div>
          </DashboardCard>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <DashboardCard
            title="Status"
            onActivate={() => openOverviewAt(6)}
            modalSelected={overviewModalOpen && overviewModalIndex === 6}
            activateAriaLabel="Open full risks by status breakdown"
          >
            <PortfolioRiskStatusCountsTable rows={riskStatusCounts} />
          </DashboardCard>
          <DashboardCard
            title="Severity"
            onActivate={() => openOverviewAt(7)}
            modalSelected={overviewModalOpen && overviewModalIndex === 7}
            activateAriaLabel="Open full risks by severity breakdown"
          >
            <PortfolioRiskSeverityCountsTable activeRiskSummaryRows={activeRiskSummaryRows} />
          </DashboardCard>
          <PortfolioRiskByCategoryCard
            riskCategoryCounts={riskCategoryCounts}
            breakdownOpen={categoryOwnerBreakdownOpen}
            onBreakdownToggle={toggleCategoryOwnerBreakdown}
            onActivate={() => openOverviewAt(8)}
            modalSelected={overviewModalOpen && overviewModalIndex === 8}
            activateAriaLabel="Open full risks by category breakdown"
          />
          <PortfolioRiskByOwnerCard
            riskOwnerCounts={riskOwnerCounts}
            breakdownOpen={categoryOwnerBreakdownOpen}
            onBreakdownToggle={toggleCategoryOwnerBreakdown}
            onActivate={() => openOverviewAt(9)}
            modalSelected={overviewModalOpen && overviewModalIndex === 9}
            activateAriaLabel="Open full risks by owner breakdown"
          />
        </div>
      </section>

      {/* Section C — Portfolio Risk Concentration */}
      <section
        className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        aria-labelledby="risk-concentration-heading"
      >
        <h2 id="risk-concentration-heading" className="sr-only">
          Portfolio risk concentration
        </h2>
        <DashboardCard
          title="Top 5 Cost Risks"
          onActivate={() => openOverviewAt(10)}
          modalSelected={overviewModalOpen && overviewModalIndex === 10}
          activateAriaLabel="Open top cost risks details"
        >
          <PortfolioTopRisksTable
            rows={topCostRiskRows}
            caption={topFiveCostRisksTableCaption(reportingMonthLabel)}
            emptyMessage="No cost risk data available. Add cost-applicable risks with positive cost impacts in your projects to populate this view."
            enableNavigation={false}
          />
        </DashboardCard>
        <DashboardCard
          title="Top 5 Schedule Risks"
          onActivate={() => openOverviewAt(11)}
          modalSelected={overviewModalOpen && overviewModalIndex === 11}
          activateAriaLabel="Open top schedule risks details"
        >
          <PortfolioTopRisksTable
            rows={topScheduleRiskRows}
            caption={
              reportingMonthLabel != null
                ? "Top five portfolio schedule risks by expected delay (current register)"
                : "Top five portfolio schedule risks by expected delay"
            }
            emptyMessage="No schedule risk data available. Add time-applicable risks with positive schedule impacts in your projects to populate this view."
            enableNavigation={false}
          />
        </DashboardCard>
      </section>

      {/* Section D — Derived opportunities (pre − modeled exposure) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-labelledby="portfolio-opportunities-heading">
        <h2 id="portfolio-opportunities-heading" className="sr-only">
          Portfolio opportunities
        </h2>
        <DashboardCard
          title="Top 5 Cost Opportunities"
          onActivate={() => openOverviewAt(12)}
          modalSelected={overviewModalOpen && overviewModalIndex === 12}
          activateAriaLabel="Open top cost opportunities details"
        >
          <PortfolioTopRisksTable
            rows={topCostOpportunityRows}
            caption="Top five portfolio cost opportunities from planned mitigation on monitoring risks"
            emptyMessage="No cost opportunities in this portfolio yet. Opportunities appear for Monitoring risks with mitigation plans and post-mitigation values, where the planned post-mitigation expected cost is lower than the pre-mitigation expected cost."
            primaryMetricLabel="Opportunity"
            enableNavigation={false}
          />
        </DashboardCard>
        <DashboardCard
          title="Top 5 Schedule Opportunities"
          onActivate={() => openOverviewAt(13)}
          modalSelected={overviewModalOpen && overviewModalIndex === 13}
          activateAriaLabel="Open top schedule opportunities details"
        >
          <PortfolioTopRisksTable
            rows={topScheduleOpportunityRows}
            caption="Top five portfolio schedule opportunities from planned mitigation on monitoring risks"
            emptyMessage="No schedule opportunities in this portfolio yet. Opportunities appear for Monitoring risks with mitigation plans and post-mitigation values, where the planned post-mitigation expected delay is lower than the pre-mitigation expected delay."
            primaryMetricLabel="Opportunity"
            enableNavigation={false}
          />
        </DashboardCard>
      </section>
      <FirstProjectPromptModal
        open={showFirstProjectPrompt}
        onStartProjectOnboarding={onStartFirstProjectOnboarding}
        onDismiss={onDismissFirstProjectPrompt}
      />
      <DocumentKpiModal
        open={overviewModalOpen}
        tiles={overviewTiles}
        index={overviewModalIndex}
        onIndexChange={setOverviewModalIndex}
        onClose={() => setOverviewModalOpen(false)}
        portfolioId={portfolioId}
        reportingUnit={reportingUnit}
        projectTilePayloads={projectTilePayloads}
        portfolioReportingFooter={portfolioReportingFooter}
        activeRiskStatusSummaryRows={activeRiskStatusSummaryRows}
        coverageRatioRows={coverageRatioRows}
        scheduleCoverageRows={scheduleCoverageRows}
        needsAttentionHealthRun={needsAttentionHealthRun}
        needsAttentionStaleCopyMode={needsAttentionStaleCopyMode}
        renderSlideBodyByIndex={renderPortfolioOverviewSlideBody}
      />
    </main>
  );
}
