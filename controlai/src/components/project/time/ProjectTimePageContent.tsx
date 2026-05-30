"use client";

import { useState, type ReactNode } from "react";
import { Card, CardBody, Tab, Tabs } from "@visualify/design-system";
import {
  TIME_MODULE_TABS,
  type TimeModuleTabId,
} from "@/components/project/time/time-module-tabs";

const SUMMARY_METRICS = [
  { title: "Schedule Health", hint: "Overall schedule performance indicator" },
  { title: "SPI", hint: "Schedule performance index" },
  { title: "Forecast Completion", hint: "Forecast finish date for the programme" },
  { title: "Critical Activities", hint: "Activities on or driving the critical path" },
] as const;

const sectionTitleClass =
  "m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]";

type TimeMetricCardProps = {
  title: string;
  hint: string;
};

function TimeMetricCard({ title, hint }: TimeMetricCardProps) {
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

type TimeSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function TimeSection({ title, children, className = "" }: TimeSectionProps) {
  return (
    <section className={`min-w-0 ${className}`.trim()}>
      <h2 className={sectionTitleClass}>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

type TimeSectionPlaceholderProps = {
  description: string;
  minHeightClass?: string;
};

function TimeSectionPlaceholder({
  description,
  minHeightClass = "min-h-[5.5rem]",
}: TimeSectionPlaceholderProps) {
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

function TimeModuleOverviewBody() {
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Time summary">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_METRICS.map((metric) => (
            <TimeMetricCard key={metric.title} title={metric.title} hint={metric.hint} />
          ))}
        </div>
      </section>

      <div
        aria-label="Schedule analysis"
        className="grid grid-cols-1 gap-4 border-t border-[var(--ds-border-subtle)] pt-4 lg:grid-cols-3"
      >
        <TimeSection className="lg:col-span-2" title="Programme Summary">
          <TimeSectionPlaceholder description="Programme structure and baseline schedule summary will appear here once schedule data is connected." />
        </TimeSection>
        <TimeSection title="Milestone Status">
          <TimeSectionPlaceholder description="Key milestone status and variance will be tracked here." />
        </TimeSection>
      </div>

      <TimeSection
        title="Critical Path Summary"
        className="border-t border-[var(--ds-border-subtle)] pt-4"
      >
        <TimeSectionPlaceholder
          description="Critical path activities and float summary will be listed here."
          minHeightClass="min-h-[4.5rem]"
        />
      </TimeSection>

      <div
        aria-label="Schedule activity and data readiness"
        className="grid grid-cols-1 gap-4 border-t border-[var(--ds-border-subtle)] pt-4 md:grid-cols-2"
      >
        <TimeSection title="Delay Drivers">
          <TimeSectionPlaceholder description="Primary delay drivers and schedule impacts will be analysed here." />
        </TimeSection>
        <TimeSection title="Data Required">
          <TimeSectionPlaceholder description="Missing inputs and integration steps needed before time controls can run." />
        </TimeSection>
      </div>
    </div>
  );
}

function TimeModuleTabComingSoon({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-8 text-center">
      <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
        {tabLabel}
      </p>
      <p className="m-0 mt-1.5 max-w-md text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Coming soon. This view will be part of the project time controls module.
      </p>
    </div>
  );
}

export function ProjectTimePageContent() {
  const [activeTab, setActiveTab] = useState<TimeModuleTabId>("overview");

  const activeTabLabel =
    TIME_MODULE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  return (
    <div className="flex min-w-0 flex-col">
      <header className="shrink-0 border-b border-[var(--ds-border-subtle)] pb-2">
        <Tabs className="-mb-px w-full" aria-label="Time module views">
          {TIME_MODULE_TABS.map((tab) => (
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
          <TimeModuleOverviewBody />
        ) : (
          <TimeModuleTabComingSoon tabLabel={activeTabLabel} />
        )}
      </div>
    </div>
  );
}
