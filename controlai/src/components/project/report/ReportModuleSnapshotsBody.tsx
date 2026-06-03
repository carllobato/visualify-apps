import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@visualify/design-system";
import { REPORT_PUBLISHED_SNAPSHOTS } from "@/components/project/report/report-mock-data";

export function ReportModuleSnapshotsBody() {
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Published report snapshots lock dashboard metrics for executive readout. Mock data only.
      </p>

      <div className="min-w-0 overflow-x-auto rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)]">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Reporting Period</TableHeaderCell>
              <TableHeaderCell>Report Date</TableHeaderCell>
              <TableHeaderCell>Published By</TableHeaderCell>
              <TableHeaderCell>Published At</TableHeaderCell>
              <TableHeaderCell>Dashboard Status</TableHeaderCell>
              <TableHeaderCell className="w-[1%]">
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_PUBLISHED_SNAPSHOTS.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{row.reportingPeriod}</TableCell>
                <TableCell className="whitespace-nowrap">{row.reportDate}</TableCell>
                <TableCell className="whitespace-nowrap">{row.publishedBy}</TableCell>
                <TableCell className="whitespace-nowrap">{row.publishedAt}</TableCell>
                <TableCell>
                  <Badge
                    status={row.dashboardStatus === "Published" ? "success" : "neutral"}
                    variant="subtle"
                  >
                    {row.dashboardStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button type="button" variant="secondary" disabled>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
