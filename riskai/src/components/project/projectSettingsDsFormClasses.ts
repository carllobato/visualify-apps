/**
 * Project Settings UI: field chrome aligned with @visualify/design-system Form Input.
 *
 * DS gaps (no exports / missing APIs):
 * - `Input` does not forward refs (focus management uses native inputs + these classes).
 * - No `Select` primitive (native `<select>` uses these classes).
 */

export function projectSettingsInputClass(invalid: boolean): string {
  const invalidClass = invalid
    ? "border-[var(--ds-status-danger-border)] focus-visible:outline-[var(--ds-status-danger)]"
    : "border-[var(--ds-border)] focus-visible:outline-[var(--ds-primary)]";
  return (
    "w-full rounded-[var(--ds-radius-md)] border bg-[var(--ds-surface-default)] px-3 py-2 h-10 " +
    "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] transition-colors duration-150 " +
    "placeholder:text-[var(--ds-text-muted)] focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] " +
    "disabled:text-[var(--ds-text-muted)] " +
    invalidClass
  );
}

export function projectSettingsNumberInputClass(invalid: boolean): string {
  return (
    projectSettingsInputClass(invalid) +
    " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  );
}

export function projectSettingsSelectClass(invalid: boolean, height: "md" | "sm" = "md"): string {
  const h = height === "sm" ? "h-9 py-1" : "h-10 py-2";
  const invalidClass = invalid
    ? "border-[var(--ds-status-danger-border)] focus-visible:outline-[var(--ds-status-danger)]"
    : "border-[var(--ds-border)] focus-visible:outline-[var(--ds-primary)]";
  return (
    `w-full rounded-[var(--ds-radius-md)] border bg-[var(--ds-surface-default)] px-3 ${h} ` +
    "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] transition-colors duration-150 " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)] " +
    invalidClass
  );
}

/** Shared field width presets for compact settings layouts. */
export function projectSettingsFieldWidthClass(width: "md" | "sm" | "xsm"): string {
  if (width === "xsm") return "max-w-48";
  if (width === "sm") return "max-w-xs";
  return "max-w-xl";
}

/** Read-only / permission-locked fields (mirrors disabled surface). */
export const projectSettingsReadOnlyFieldClass =
  "read-only:cursor-not-allowed read-only:bg-[var(--ds-surface-muted)] read-only:text-[var(--ds-text-muted)]";
