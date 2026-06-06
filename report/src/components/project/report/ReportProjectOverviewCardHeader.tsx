type ReportProjectOverviewCardHeaderProps = {
  title: string;
};

export function ReportProjectOverviewCardHeader({
  title,
}: ReportProjectOverviewCardHeaderProps) {
  return (
    <div className="mb-2 flex shrink-0 items-center border-b border-[var(--ds-border-subtle)] pb-2">
      <p className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
        {title}
      </p>
    </div>
  );
}
