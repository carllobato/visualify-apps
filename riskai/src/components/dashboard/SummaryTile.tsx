type SummaryTileProps = {
  title: string;
  primaryValue: string;
  subtext?: string;
};

/**
 * KPI summary tile: title, large primary value, optional contextual subtext.
 */
export function SummaryTile({ title, primaryValue, subtext }: SummaryTileProps) {
  return (
    <div className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-4 flex flex-col min-h-[88px]">
      <p className="text-sm font-medium text-[var(--ds-text-secondary)] m-0 mb-1">
        {title}
      </p>
      <p className="text-2xl font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight">
        {primaryValue}
      </p>
      {subtext != null && subtext !== "" && (
        <p className="text-xs text-[var(--ds-text-muted)] mt-1 m-0">
          {subtext}
        </p>
      )}
    </div>
  );
}
