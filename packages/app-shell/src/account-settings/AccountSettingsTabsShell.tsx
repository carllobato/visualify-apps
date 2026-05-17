import type { ReactNode } from "react";
import { accountSettingsTabsShellClassName } from "./classes";
import { mergeClass } from "./merge-class";

export type AccountSettingsTabsShellProps = {
  children: ReactNode;
  className?: string;
};

/** Border-bottom wrapper for design-system `Tabs` on account settings pages. */
export function AccountSettingsTabsShell({ children, className }: AccountSettingsTabsShellProps) {
  return <div className={mergeClass(accountSettingsTabsShellClassName, className)}>{children}</div>;
}
