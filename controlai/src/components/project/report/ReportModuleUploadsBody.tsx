import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@visualify/design-system";
import { REPORT_UPLOAD_HISTORY } from "@/components/project/report/report-mock-data";

export function ReportModuleUploadsBody() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-6 text-center">
        <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
          Upload report snapshots will appear here.
        </p>
        <p className="m-0 mt-1.5 max-w-md text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
          GreenSquare Excel uploads will populate the live report covers once connected. Mock
          controls only.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" disabled>
            Upload Excel
          </Button>
          <Button type="button" variant="secondary" disabled>
            Upload PowerPoint
          </Button>
        </div>
      </div>

      <section aria-label="Upload history">
        <h2 className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Upload history
        </h2>
        <div className="mt-2 min-w-0 overflow-x-auto rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)]">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Reporting Period</TableHeaderCell>
                <TableHeaderCell>File Name</TableHeaderCell>
                <TableHeaderCell>Uploaded By</TableHeaderCell>
                <TableHeaderCell>Uploaded At</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {REPORT_UPLOAD_HISTORY.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{row.reportingPeriod}</TableCell>
                  <TableCell className="min-w-[12rem] font-medium">{row.fileName}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.uploadedBy}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.uploadedAt}</TableCell>
                  <TableCell>
                    <Badge
                      status={row.status === "Processed" ? "success" : "neutral"}
                      variant="subtle"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
