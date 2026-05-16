import {
  RAIL_ROW_ACTIVE_CLASS,
  RAIL_ROW_INACTIVE_CLASS,
  RAIL_ROW_SHELL_CLASS,
} from "./rail-row-classes";

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
