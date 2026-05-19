import type { ReactNode } from "react";
import { AppShellPageHeader, appShellPageTitleClassName } from "../AppShellPageHeader";
import { shellPageHeaderRailRowClassName } from "../rail-row-classes";
import { accountSettingsHeaderRowClassName } from "./classes";
import { mergeClass } from "./merge-class";

export type AccountSettingsHeaderProps = {
  title?: string;
  description?: ReactNode;
  /** Shown on the right (or below on narrow screens) — e.g. unsaved profile actions. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Page title block for account settings.
 * Default: HQ row layout (`mb-8`) with optional right-side actions (empty slot when clean).
 * Legacy stacked layout only when `description` is set and `actions` is omitted.
 */
export function AccountSettingsHeader({
  title = "Account settings",
  description,
  actions,
  className,
}: AccountSettingsHeaderProps) {
  const actionsSlotPassed = actions !== undefined;

  if (description && !actionsSlotPassed) {
    return (
      <AppShellPageHeader
        title={title}
        description={description}
        className={mergeClass("mb-6", className)}
      />
    );
  }

  return (
    <div className={mergeClass(accountSettingsHeaderRowClassName, className)}>
      <div className={shellPageHeaderRailRowClassName}>
        <h1 className={appShellPageTitleClassName}>{title}</h1>
      </div>
      {actions ?? null}
    </div>
  );
}
