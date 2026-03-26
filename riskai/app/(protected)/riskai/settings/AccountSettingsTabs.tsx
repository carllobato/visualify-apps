"use client";

import { useState } from "react";
import { Tab, Tabs } from "@visualify/design-system";

type AccountSettingsTab = "profile" | "danger";

export function AccountSettingsTabs({
  profilePanel,
  dangerPanel,
}: {
  profilePanel: React.ReactNode;
  dangerPanel: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<AccountSettingsTab>("profile");

  return (
    <>
      <div className="mb-4 border-b border-[var(--ds-border)]">
        <Tabs>
          <Tab active={activeTab === "profile"} onClick={() => setActiveTab("profile")}>
            Profile
          </Tab>
          <Tab active={activeTab === "danger"} onClick={() => setActiveTab("danger")}>
            Danger zone
          </Tab>
        </Tabs>
      </div>
      {activeTab === "profile" ? profilePanel : null}
      {activeTab === "danger" ? dangerPanel : null}
    </>
  );
}
