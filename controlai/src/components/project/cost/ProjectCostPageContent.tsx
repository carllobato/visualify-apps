"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Card, CardBody, Tab, Tabs } from "@visualify/design-system";
import { CostModuleBudgetBody } from "@/components/project/cost/CostModuleBudgetBody";
import {
  COST_MODULE_TABS,
  type CostModuleTabId,
} from "@/components/project/cost/cost-module-tabs";
import {
  formatBudgetAmountDisplay,
  sumDirectBudgetAmounts,
} from "@/lib/cost/cost-budget-display";
import type { CostModuleBudgetData } from "@/lib/cost/cost-budget-types";

const SUMMARY_METRICS = [
  { title: "Approved Budget", hint: "Baseline budget for this project" },
  { title: "Committed Cost", hint: "Purchase orders and commitments" },
  { title: "Forecast Cost", hint: "Expected cost at completion" },
  { title: "Forecast Variance", hint: "Variance to approved budget" },
] as const;

const sectionTitleClass =
  "m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]";

type CostMetricCardProps = {
  title: string;
  hint: string;
  value?: string;
  valueAriaLabel?: string;
  onClick?: () => void;
};

function CostMetricCard({ title, hint, value, valueAriaLabel, onClick }: CostMetricCardProps) {
  const displayValue = value ?? "—";
  const valueClassName =
    "m-0 text-[length:var(--ds-text-2xl)] font-semibold tracking-tight tabular-nums text-[var(--ds-text-primary)]";

  const valueNode = onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${valueClassName} cursor-pointer rounded-[var(--ds-radius-sm)] text-left underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]`}
      aria-label={valueAriaLabel ?? `View ${title}`}
    >
      {displayValue}
    </button>
  ) : (
    <p
      className={valueClassName}
      aria-label={valueAriaLabel ?? (value ? undefined : `${title} not yet available`)}
    >
      {displayValue}
    </p>
  );

  return (
    <Card className="min-w-0">
      <CardBody className="flex flex-col gap-1 py-3">
        <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
          {title}
        </p>
        {valueNode}
        <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{hint}</p>
      </CardBody>
    </Card>
  );
}

type CostSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function CostSection({ title, children, className = "" }: CostSectionProps) {
  return (
    <section className={`min-w-0 ${className}`.trim()}>
      <h2 className={sectionTitleClass}>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

type CostSectionPlaceholderProps = {
  description: string;
  minHeightClass?: string;
};

function CostSectionPlaceholder({
  description,
  minHeightClass = "min-h-[5.5rem]",
}: CostSectionPlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-4 text-center ${minHeightClass}`}
    >
      <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
        Coming soon
      </p>
      <p className="m-0 mt-1 max-w-md text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
        {description}
      </p>
    </div>
  );
}

type CostModuleOverviewBodyProps = {
  approvedBudgetDisplay: string;
  onOpenBudgetTab: () => void;
};

function CostModuleOverviewBody({
  approvedBudgetDisplay,
  onOpenBudgetTab,
}: CostModuleOverviewBodyProps) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Cost summary">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_METRICS.map((metric) =>
            metric.title === "Approved Budget" ? (
              <CostMetricCard
                key={metric.title}
                title={metric.title}
                hint={metric.hint}
                value={approvedBudgetDisplay}
                valueAriaLabel={`Approved budget total ${approvedBudgetDisplay}, open Budget tab`}
                onClick={onOpenBudgetTab}
              />
            ) : (
              <CostMetricCard key={metric.title} title={metric.title} hint={metric.hint} />
            ),
          )}
        </div>
      </section>

      <div
        aria-label="Cost analysis"
        className="grid grid-cols-1 gap-4 border-t border-[var(--ds-border-subtle)] pt-4 lg:grid-cols-3"
      >
        <CostSection className="lg:col-span-2" title="Cost Breakdown">
          <CostSectionPlaceholder description="Category and work-package breakdown will appear here once cost data is connected." />
        </CostSection>
        <CostSection title="Forecast Trend">
          <CostSectionPlaceholder description="Forecast trend over reporting periods will be charted here. No chart data yet." />
        </CostSection>
      </div>

      <CostSection
        title="Top Cost Movements"
        className="border-t border-[var(--ds-border-subtle)] pt-4"
      >
        <CostSectionPlaceholder
          description="Largest forecast and commitment movements will be listed here."
          minHeightClass="min-h-[4.5rem]"
        />
      </CostSection>

      <div
        aria-label="Cost activity and data readiness"
        className="grid grid-cols-1 gap-4 border-t border-[var(--ds-border-subtle)] pt-4 md:grid-cols-2"
      >
        <CostSection title="Recent Changes">
          <CostSectionPlaceholder description="Recent budget, commitment, and forecast changes will be tracked here." />
        </CostSection>
        <CostSection title="Data Required">
          <CostSectionPlaceholder description="Missing inputs and integration steps needed before cost controls can run." />
        </CostSection>
      </div>
    </div>
  );
}

function CostModuleTabComingSoon({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-8 text-center">
      <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
        {tabLabel}
      </p>
      <p className="m-0 mt-1.5 max-w-md text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Coming soon. This view will be part of the project cost controls module.
      </p>
    </div>
  );
}

type ProjectCostPageContentProps = {
  projectId: string;
  budgetData: CostModuleBudgetData;
};

export function ProjectCostPageContent({ projectId, budgetData }: ProjectCostPageContentProps) {
  const [activeTab, setActiveTab] = useState<CostModuleTabId>("overview");
  const [budgetToolbar, setBudgetToolbar] = useState<ReactNode>(null);
  const registerBudgetToolbar = useCallback((toolbar: ReactNode | null) => {
    setBudgetToolbar(toolbar);
  }, []);

  const approvedBudgetTotal = useMemo(
    () => sumDirectBudgetAmounts(budgetData.budgetRows),
    [budgetData.budgetRows],
  );

  const approvedBudgetDisplay = useMemo(
    () =>
      budgetData.budgetRows.length > 0
        ? formatBudgetAmountDisplay(approvedBudgetTotal)
        : "—",
    [approvedBudgetTotal, budgetData.budgetRows.length],
  );

  const activeTabLabel =
    COST_MODULE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  return (
    <div className="flex min-w-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-[var(--ds-border-subtle)] pb-2">
        <Tabs className="-mb-px min-w-0 flex-1" aria-label="Cost module views">
          {COST_MODULE_TABS.map((tab) => (
            <Tab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Tab>
          ))}
        </Tabs>
        {activeTab === "budget" && budgetToolbar ? (
          <div className="shrink-0 pb-px">{budgetToolbar}</div>
        ) : null}
      </header>

      <div className="min-w-0 pt-4">
        {activeTab === "overview" ? (
          <CostModuleOverviewBody
            approvedBudgetDisplay={approvedBudgetDisplay}
            onOpenBudgetTab={() => setActiveTab("budget")}
          />
        ) : activeTab === "budget" ? (
          <CostModuleBudgetBody
            projectId={projectId}
            budgetData={budgetData}
            registerToolbar={registerBudgetToolbar}
          />
        ) : (
          <CostModuleTabComingSoon tabLabel={activeTabLabel} />
        )}
      </div>
    </div>
  );
}
