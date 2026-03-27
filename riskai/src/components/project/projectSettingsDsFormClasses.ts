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

/** Multiline fields (e.g. description) — same chrome as {@link projectSettingsInputClass} without fixed height. */
export function projectSettingsTextareaClass(invalid: boolean): string {
  const invalidClass = invalid
    ? "border-[var(--ds-status-danger-border)] focus-visible:outline-[var(--ds-status-danger)]"
    : "border-[var(--ds-border)] focus-visible:outline-[var(--ds-primary)]";
  return (
    "w-full min-h-[5rem] rounded-[var(--ds-radius-md)] border bg-[var(--ds-surface-default)] px-3 py-2 " +
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

/**
 * Members table Actions column and matching Add row: center the fixed slot in the cell (matches Actions
 * header); inner centers Remove / Add / — in that slot.
 */
export const membersActionsSlotOuterClass = "flex w-full justify-center";
export const membersActionsSlotInnerClass =
  "flex w-[6.25rem] min-w-[6.25rem] shrink-0 items-center justify-center";

/** Signed-in member row in members tables (project + portfolio settings). */
export const membersTableCurrentUserRowClass =
  "bg-[color-mix(in_oklab,var(--ds-surface-muted)_55%,var(--ds-surface-default))]";

/** Members table Name column + add-member name fields (same width as colgroup). */
export const MEMBERS_NAME_COLUMN_WIDTH = "20rem";

/** Matches colgroup Actions column + {@link membersActionsSlotInnerClass} width. */
export const MEMBERS_ACTIONS_COLUMN_WIDTH = "6.25rem";

/** Role column width — same value in members `colgroup` and add-member grid. */
export const MEMBERS_ROLE_COLUMN_WIDTH = "14.3125rem";

/**
 * Add member card: horizontal inset matches members table wrapper (`-mx-1`) so column tracks line up.
 */
export const membersAddMemberCardGridClass = [
  "-mx-1 grid grid-cols-1 gap-y-2",
  // Keep this as a literal Tailwind class so production builds don't purge it.
  "sm:grid-cols-[20rem_minmax(0,1fr)_14.3125rem_6.25rem]",
  "sm:gap-x-0 sm:gap-y-0 sm:items-end",
].join(" ");

/** Add-member role `<select>`: muted label until user picks a role (matches input placeholder tone). */
export function membersAddMemberRoleSelectClass(hasSelectedRole: boolean): string {
  return (
    projectSettingsSelectClass(false, "md") +
    (hasSelectedRole ? "" : " !text-[var(--ds-text-muted)]")
  );
}

/** Disabled first option + validation copy when submitting without a role. */
export const ADD_MEMBER_ROLE_PLACEHOLDER_LABEL = "Select a Role";
export const ADD_MEMBER_ROLE_VALIDATION_ERROR = `${ADD_MEMBER_ROLE_PLACEHOLDER_LABEL}.`;

/**
 * Add-member grid cells: `pr-3` only (no left pad) so columns don’t stack double horizontal inset next to
 * each field’s border; gutter between columns is each cell’s right padding.
 */
export const membersAddMemberCardCellClass = "min-w-0 w-full pl-0 pr-3";

/** Email column: no right pad (role column’s `pl-3` is the gutter before Role). */
export const membersAddMemberCardCellClassEmail = "min-w-0 w-full pl-0 pr-0";

/** Role column in add-member row: `px-3` so the select lines up with members table `TableCell` padding. */
export const membersAddMemberCardCellClassRole = "min-w-0 w-full px-3";
