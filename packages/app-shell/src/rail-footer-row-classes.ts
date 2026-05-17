import {
  RAIL_ROW_ACTIVE_CLASS,
  RAIL_ROW_INACTIVE_CLASS,
  RAIL_ROW_SHELL_CLASS,
} from "./rail-row-classes";

/** Standard rail nav link row (primary nav). */
export function appShellRailNavRowClass(active: boolean): string {
  return `${RAIL_ROW_SHELL_CLASS}${active ? RAIL_ROW_ACTIVE_CLASS : RAIL_ROW_INACTIVE_CLASS}`;
}

/** Rail `<button>` row (workspace picker, sign-out, etc.). */
export function appShellRailNavButtonRowClass(
  active: boolean,
  options?: { transparentWhenInactive?: boolean },
): string {
  const transparentWhenInactive = options?.transparentWhenInactive ?? true;
  return (
    appShellRailNavRowClass(active) +
    " w-full cursor-pointer border-0 text-left disabled:opacity-50 " +
    (!active && transparentWhenInactive ? "bg-transparent " : "")
  );
}

/** Footer control row (pin/collapse) — same chrome as nav rows. */
export function appShellRailFooterControlRowClass(active: boolean): string {
  return (
    `${RAIL_ROW_SHELL_CLASS}${active ? RAIL_ROW_ACTIVE_CLASS : RAIL_ROW_INACTIVE_CLASS}` +
    " cursor-pointer border-0 text-left no-underline " +
    (active ? "" : "bg-transparent ")
  );
}

/** Footer account trigger row — same chrome as nav rows. */
export function appShellRailFooterAccountRowClass(active: boolean): string {
  return (
    `${RAIL_ROW_SHELL_CLASS}${active ? RAIL_ROW_ACTIVE_CLASS : RAIL_ROW_INACTIVE_CLASS}` +
    " cursor-pointer border-0 text-left no-underline " +
    (active ? "" : "bg-transparent ")
  );
}
