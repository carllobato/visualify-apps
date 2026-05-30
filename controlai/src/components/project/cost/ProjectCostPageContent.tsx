"use client";

import { useState, type ReactNode } from "react";
import { Card, CardBody, Tab, Tabs } from "@visualify/design-system";
import {
  COST_MODULE_TABS,
  type CostModuleTabId,
} from "@/components/project/cost/cost-module-tabs";

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
};

function CostMetricCard({ title, hint }: CostMetricCardProps) {
  return (
    <Card className="min-w-0">
      <CardBody className="flex flex-col gap-1 py-3">
        <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
          {title}
        </p>
        <p
          className="m-0 text-[length:var(--ds-text-2xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
          aria-label={`${title} not yet available`}
        >
          —
        </p>
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

function CostModuleOverviewBody() {
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Cost summary">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_METRICS.map((metric) => (
            <CostMetricCard key={metric.title} title={metric.title} hint={metric.hint} />
          ))}
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

export function ProjectCostPageContent() {
  const [activeTab, setActiveTab] = useState<CostModuleTabId>("overview");

  const activeTabLabel =
    COST_MODULE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  return (
    <div className="flex min-w-0 flex-col">
      <header className="shrink-0 border-b border-[var(--ds-border-subtle)] pb-2">
        <Tabs className="-mb-px w-full" aria-label="Cost module views">
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
      </header>

      <div className="min-w-0 pt-4">
        {activeTab === "overview" ? (
          <CostModuleOverviewBody />
        ) : (
          <CostModuleTabComingSoon tabLabel={activeTabLabel} />
        )}
      </div>
    </div>
  );
}
