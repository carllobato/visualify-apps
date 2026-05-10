/**
 * App catalog tiles on the primary surface sheet (e.g. HQ home grid).
 * Follows the row-tile ladder in globals.css: --ds-surface-tile + --ds-elevation-tile
 * (borderless rim; separation from elevation), with hover matching interactive row tiles.
 */
export const dsAppLaunchTileInteractiveClass = [
  "flex h-full min-h-[6rem] flex-col rounded-[var(--ds-radius-md)]",
  "border border-transparent bg-[var(--ds-surface-tile)] p-3 no-underline text-[var(--ds-text-primary)]",
  "shadow-[var(--ds-elevation-tile)]",
  "transition-[transform,background-color,box-shadow] duration-150 ease-out",
  "hover:-translate-y-px hover:bg-[var(--ds-surface-tile-hover)] hover:shadow-[var(--ds-elevation-tile-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface)]",
].join(" ");

/** Disabled / coming-soon tile — muted fill, no elevation (not interactive). */
export const dsAppLaunchTilePlaceholderClass = [
  "flex h-full min-h-[6rem] flex-col rounded-[var(--ds-radius-md)]",
  "border border-transparent bg-[var(--ds-surface-muted)] p-3",
].join(" ");
