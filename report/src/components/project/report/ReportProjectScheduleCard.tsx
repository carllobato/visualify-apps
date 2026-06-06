import { Card, CardContent } from "@visualify/design-system";

export function ReportProjectScheduleCard() {
  return (
    <Card className="h-full w-full min-w-0">
      <CardContent className="flex h-full flex-col px-4 py-3">
        <p className="m-0 mb-2 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Schedule
        </p>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-6 text-center">
          <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
            Coming soon
          </p>
          <p className="m-0 mt-1 max-w-xs text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
            Programme milestones and schedule performance will appear here once schedule data is connected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
