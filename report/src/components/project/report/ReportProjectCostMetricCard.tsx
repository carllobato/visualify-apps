import { Card, CardContent } from "@visualify/design-system";

type ReportProjectCostMetricCardProps = {
  label: string;
  value: string;
  helperText?: string;
};

export function ReportProjectCostMetricCard({
  label,
  value,
  helperText,
}: ReportProjectCostMetricCardProps) {
  return (
    <Card className="h-full w-full min-w-0">
      <CardContent className="px-4 py-3">
        <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
          {label}
        </p>
        <p className="m-0 mt-1 text-[length:var(--ds-text-2xl)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
          {value}
        </p>
        {helperText ? (
          <p className="m-0 mt-0.5 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {helperText}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
