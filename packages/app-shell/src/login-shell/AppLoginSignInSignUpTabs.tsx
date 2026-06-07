"use client";

import { Tab, Tabs } from "@visualify/design-system";
import { AppLoginTabsSection } from "./AppLoginTabsSection";

export type AppLoginTabId = "signin" | "signup";

export type AppLoginSignInSignUpTabsProps = {
  activeTab: AppLoginTabId;
  onTabChange: (tab: AppLoginTabId) => void;
};

/** Standard Sign in / Sign up tab row for product login cards. */
export function AppLoginSignInSignUpTabs({ activeTab, onTabChange }: AppLoginSignInSignUpTabsProps) {
  return (
    <AppLoginTabsSection>
      <Tabs className="max-w-full shrink-0">
        <Tab type="button" active={activeTab === "signin"} onClick={() => onTabChange("signin")}>
          Sign in
        </Tab>
        <Tab type="button" active={activeTab === "signup"} onClick={() => onTabChange("signup")}>
          Sign up
        </Tab>
      </Tabs>
    </AppLoginTabsSection>
  );
}
