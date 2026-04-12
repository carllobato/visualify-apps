import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
  /** Renders in the title row beside the heading (aligned end), e.g. expand toggles. */
  headerActions?: ReactNode;
  /** Opens a detail modal; card shows {@link modalSelected} outline while that modal is open. */
  onActivate?: () => void;
  /** Primary outline while a linked detail modal is open (see `.ds-document-tile-panel--modal-selected`). */
  modalSelected?: boolean;
  /** Optional accessible name when the card is clickable (recommended for assistive tech). */
  activateAriaLabel?: string;
};

/**
 * Reusable container card for dashboard sections. Consistent padding, border, and background.
 */
export function DashboardCard({
  title,
  children,
  className,
  headerActions,
  onActivate,
  modalSelected,
  activateAriaLabel,
}: DashboardCardProps) {
  const interactive = typeof onActivate === "function";
  const panelClass = [
    "ds-document-tile-panel ds-document-tile-panel--interactive overflow-hidden",
    modalSelected ? "ds-document-tile-panel--modal-selected" : "",
    interactive ? "cursor-pointer" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={panelClass}
      onClick={interactive ? () => onActivate?.() : undefined}
      aria-label={interactive && activateAriaLabel ? activateAriaLabel : undefined}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ds-border)] px-4 py-3">
        <h2 className="m-0 min-w-0 flex-1 text-base font-semibold text-[var(--ds-text-primary)]">{title}</h2>
        {headerActions != null ? (
          <div
            className="flex shrink-0 items-center"
            onClick={interactive ? (e) => e.stopPropagation() : undefined}
            onKeyDown={interactive ? (e) => e.stopPropagation() : undefined}
          >
            {headerActions}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
