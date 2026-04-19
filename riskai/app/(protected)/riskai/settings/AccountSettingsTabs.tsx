"use client";

import { useState } from "react";
import { Tab, Tabs } from "@visualify/design-system";

type AccountSettingsTab = "profile" | "authentication" | "danger";

export function AccountSettingsTabs({
  profilePanel,
  authenticationPanel,
  dangerPanel,
}: {
  profilePanel: React.ReactNode;
  authenticationPanel: React.ReactNode;
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
          <Tab
            active={activeTab === "authentication"}
            onClick={() => setActiveTab("authentication")}
          >
            Authentication
          </Tab>
          <Tab active={activeTab === "danger"} onClick={() => setActiveTab("danger")}>
            Danger Zone
          </Tab>
        </Tabs>
      </div>
      {activeTab === "profile" ? profilePanel : null}
      {activeTab === "authentication" ? authenticationPanel : null}
      {activeTab === "danger" ? dangerPanel : null}
    </>
  );
}
