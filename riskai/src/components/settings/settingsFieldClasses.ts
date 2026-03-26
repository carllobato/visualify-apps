/**
 * Shared layout and control styling for Project Settings and Portfolio Settings.
 */

export const settingsCardClass =
  "rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-4 sm:p-5";

/** Section heading inside a settings card (h2). */
export const settingsSectionTitleClass =
  "text-base font-semibold text-[var(--ds-text-primary)] mb-3 border-b border-[var(--ds-border)] pb-2";

/** Section heading outside a card (e.g. read-only meta block). */
export const settingsStandaloneSectionTitleClass =
  "text-base font-semibold text-[var(--ds-text-primary)] mb-3";

export const settingsLabelClass =
  "block text-sm font-medium text-[var(--ds-text-secondary)] mb-1";

/** Single-line inputs and selects (members table row selects use h-9 via extra class). */
export const settingsInputClass =
  "w-full rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] h-10";

export const settingsTextareaClass =
  "w-full rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] min-h-10";

export const settingsInputErrorClass =
  "w-full rounded-md border-2 border-[var(--ds-status-danger)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--ds-status-danger)_42%,transparent)] min-h-10";

export const settingsInputErrorClassSingleLine =
  "w-full rounded-md border-2 border-[var(--ds-status-danger)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--ds-status-danger)_42%,transparent)] h-10";

/** Append when a field is read-only or disabled due to permissions. */
export const settingsFieldLockedClass = "opacity-90 cursor-not-allowed";

export const settingsPrimaryButtonClass =
  "px-4 py-2 rounded-md border border-[var(--ds-border)] bg-[var(--ds-text-primary)] text-[var(--ds-text-inverse)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

export const settingsMemberAddButtonClass =
  "h-10 px-4 rounded-md border border-[var(--ds-border)] bg-[var(--ds-text-primary)] text-[var(--ds-text-inverse)] text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed";
