/** Main column inside {@link AppShellScrollRegion} — no extra horizontal padding (HQ account page). */
export const accountSettingsPageShellClassName = "w-full min-w-0 shrink-0 px-0 pb-4";

/** Standalone document padding when the page is not inside app-shell scroll inset. */
export const accountSettingsPageLegacyPaddingClassName = "w-full px-4 py-6 sm:px-6";

/** Vertical stack between cards in a tab panel (HQ `space-y-4`). */
export const accountSettingsPanelSectionClassName = "space-y-4";

export const accountSettingsCardClassName =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

export const accountSettingsCardHeaderClassName = "!px-4 !py-2.5";

export const accountSettingsCardContentClassName = "!px-4 !py-3";

/** Profile / dense form panels (slightly more vertical padding). */
export const accountSettingsCardContentFormClassName = "!p-4";

export const accountSettingsCardFooterClassName = "!px-4 !py-3";

export const accountSettingsCardTitleClassName =
  "m-0 text-sm font-semibold text-[var(--ds-text-primary)]";

export const accountSettingsCardTitleDangerClassName =
  "m-0 text-sm font-semibold text-[var(--ds-status-danger-fg)]";

/** Title row + optional actions; always `mb-8` before tabs (HQ account settings). */
export const accountSettingsHeaderRowClassName =
  "mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

export const accountSettingsHeaderStackedTitleClassName =
  "mb-1 text-2xl font-semibold text-[var(--ds-text-primary)]";

export const accountSettingsHeaderTitleClassName =
  "m-0 text-2xl font-semibold text-[var(--ds-text-primary)]";

export const accountSettingsHeaderDescriptionClassName =
  "mb-6 text-sm text-[var(--ds-text-secondary)]";

/** Tab list underline + spacing before active panel (HQ `mb-4 border-b`). */
export const accountSettingsTabsShellClassName = "mb-4 border-b border-[var(--ds-border)]";

export const accountSettingsIntroTextClassName = "mb-3 text-sm text-[var(--ds-text-secondary)]";
