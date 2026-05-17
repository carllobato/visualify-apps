import type { ReactNode } from "react";
import {
  accountSettingsHeaderDescriptionClassName,
  accountSettingsHeaderRowClassName,
  accountSettingsHeaderStackedTitleClassName,
  accountSettingsHeaderTitleClassName,
} from "./classes";
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
      <header className={className}>
        <h1 className={accountSettingsHeaderStackedTitleClassName}>{title}</h1>
        <p className={accountSettingsHeaderDescriptionClassName}>{description}</p>
      </header>
    );
  }

  return (
    <div className={mergeClass(accountSettingsHeaderRowClassName, className)}>
      <h1 className={accountSettingsHeaderTitleClassName}>{title}</h1>
      {actions ?? null}
    </div>
  );
}
