"use client";

import { useState } from "react";
import { Tab, Tabs } from "@visualify/design-system";
import {
  RISK_MODULE_TABS,
  type RiskModuleTabId,
} from "@/components/project/risk/risk-module-tabs";

const RISK_MODULE_PLACEHOLDER =
  "Risk module content will be built here.";

function RiskModuleOverviewBody() {
  return (
    <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
      {RISK_MODULE_PLACEHOLDER}
    </p>
  );
}

function RiskModuleTabComingSoon({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-8 text-center">
      <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
        {tabLabel}
      </p>
      <p className="m-0 mt-1.5 max-w-md text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Coming soon. This view will be part of the project risk module.
      </p>
    </div>
  );
}

export function ProjectRiskPageContent() {
  const [activeTab, setActiveTab] = useState<RiskModuleTabId>("overview");

  const activeTabLabel =
    RISK_MODULE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  return (
    <div className="flex min-w-0 flex-col">
      <header className="shrink-0 border-b border-[var(--ds-border-subtle)] pb-2">
        <Tabs className="-mb-px w-full" aria-label="Risk module views">
          {RISK_MODULE_TABS.map((tab) => (
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
          <RiskModuleOverviewBody />
        ) : (
          <RiskModuleTabComingSoon tabLabel={activeTabLabel} />
        )}
      </div>
    </div>
  );
}
