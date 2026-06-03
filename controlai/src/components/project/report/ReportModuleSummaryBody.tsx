import {
  Badge,
  Card,
  CardBody,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";
import {
  REPORT_KEY_PROJECT_METRICS,
  REPORT_SAFETY_METRICS,
  REPORT_SUMMARY_CATEGORY_ROWS,
} from "@/components/project/report/report-mock-data";
import { ReportSection, ReportTableFrame } from "@/components/project/report/report-ui";

function statusBadgeStatus(status: string): "success" | "warning" | "danger" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized === "green") return "success";
  if (normalized === "amber" || normalized === "yellow") return "warning";
  if (normalized === "red") return "danger";
  return "neutral";
}

export function ReportModuleSummaryBody() {
  return (
    <div className="flex w-full flex-col gap-4">
      <ReportSection title="Key Project Metrics">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {REPORT_KEY_PROJECT_METRICS.map((metric) => (
            <Card key={metric.label} className="min-w-0">
              <CardBody className="py-3">
                <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                  {metric.label}
                </p>
                <p className="m-0 mt-0.5 text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
                  {metric.value}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="Category status">
          <Card className="min-w-0">
            <CardBody className="p-0">
              <ReportTableFrame>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Summary</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {REPORT_SUMMARY_CATEGORY_ROWS.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap font-medium">{row.category}</TableCell>
                      <TableCell>
                        <Badge status={statusBadgeStatus(row.status)} variant="subtle">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[16rem]">{row.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ReportTableFrame>
            </CardBody>
          </Card>
      </ReportSection>

      <ReportSection title="Safety metrics">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Metric</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_SAFETY_METRICS.map((metric) => (
              <TableRow key={metric.label}>
                <TableCell className="min-w-[14rem] font-medium">{metric.label}</TableCell>
                <TableCell>
                  {"badgeStatus" in metric && metric.badgeStatus ? (
                    <Badge status={metric.badgeStatus} variant="subtle">
                      {metric.value}
                    </Badge>
                  ) : (
                    metric.value
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTableFrame>
      </ReportSection>
    </div>
  );
}
