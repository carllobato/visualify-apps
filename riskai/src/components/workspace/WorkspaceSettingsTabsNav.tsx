"use client";

import { useRouter } from "next/navigation";
import { Tab, Tabs } from "@visualify/design-system";
import { riskaiPath } from "@/lib/routes";

export type WorkspaceSettingsTab = "general" | "details" | "members" | "billing";

type Props = {
  workspaceId: string;
  activeTab: WorkspaceSettingsTab;
  /** On `/settings`, switch General/Details in place. Other tabs navigate. */
  onSelectTab?: (tab: "general" | "details") => void;
};

export function WorkspaceSettingsTabsNav({ workspaceId, activeTab, onSelectTab }: Props) {
  const router = useRouter();
  const settingsBase = riskaiPath(`/workspaces/${workspaceId}/settings`);
  const membersHref = riskaiPath(`/workspaces/${workspaceId}/settings/members`);
  const billingHref = riskaiPath(`/workspaces/${workspaceId}/settings/billing`);

  const goGeneral = () => {
    if (onSelectTab) {
      onSelectTab("general");
      return;
    }
    router.push(settingsBase);
  };

  const goDetails = () => {
    if (onSelectTab) {
      onSelectTab("details");
      return;
    }
    router.push(`${settingsBase}?tab=details`);
  };

  const goMembers = () => {
    if (activeTab !== "members") {
      router.push(membersHref);
    }
  };

  const goBilling = () => {
    if (activeTab !== "billing") {
      router.push(billingHref);
    }
  };

  return (
    <div className="mb-4 border-b border-[var(--ds-border)]">
      <Tabs>
        <Tab active={activeTab === "general"} onClick={goGeneral}>
          General
        </Tab>
        <Tab active={activeTab === "details"} onClick={goDetails}>
          Details
        </Tab>
        <Tab active={activeTab === "members"} onClick={goMembers}>
          Members
        </Tab>
        <Tab active={activeTab === "billing"} onClick={goBilling}>
          Billing
        </Tab>
      </Tabs>
    </div>
  );
}
