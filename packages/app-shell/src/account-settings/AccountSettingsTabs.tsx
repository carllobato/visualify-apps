"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Tab, Tabs } from "@visualify/design-system";
import { AccountSettingsTabsShell } from "./AccountSettingsTabsShell";

export type AccountSettingsTabConfig = {
  id: string;
  label: string;
  panel: ReactNode;
};

export type AccountSettingsTabsProps = {
  tabs: readonly AccountSettingsTabConfig[];
  /** Tab id to show first; defaults to the first entry in `tabs`. */
  initialTabId?: string;
};

export function AccountSettingsTabs({ tabs, initialTabId }: AccountSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTabId && tabs.some((t) => t.id === initialTabId)) {
      return initialTabId;
    }
    return tabs[0]?.id ?? "";
  });

  const activePanel = tabs.find((tab) => tab.id === activeTab)?.panel ?? null;

  return (
    <>
      <AccountSettingsTabsShell>
        <Tabs>
          {tabs.map((tab) => (
            <Tab key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </Tab>
          ))}
        </Tabs>
      </AccountSettingsTabsShell>
      {activePanel}
    </>
  );
}
