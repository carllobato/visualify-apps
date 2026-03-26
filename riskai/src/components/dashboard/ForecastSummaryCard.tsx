import { Card, CardBody, CardHeader, CardTitle } from "@visualify/design-system";

export type PercentileItem = {
  label: string;
  value: string;
};

type ForecastSummaryCardProps = {
  title: string;
  percentiles: PercentileItem[];
  emptyMessage?: string;
};

/**
 * Card displaying forecast percentiles (e.g. P10, P50, P80, P90) for cost or schedule.
 */
export function ForecastSummaryCard({
  title,
  percentiles,
  emptyMessage = "No forecast data",
}: ForecastSummaryCardProps) {
  const hasData = percentiles.length > 0 && percentiles.some((p) => p.value !== "—" && p.value !== "");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <CardTitle className="text-[length:var(--ds-text-base)]">{title}</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {!hasData ? (
          <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {percentiles.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-inset)] p-3"
              >
                <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  {label}
                </div>
                <div className="mt-0.5 text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
