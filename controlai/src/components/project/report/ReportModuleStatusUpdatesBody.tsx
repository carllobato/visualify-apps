import { Badge, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@visualify/design-system";
import { REPORT_STATUS_UPDATES } from "@/components/project/report/report-mock-data";
import { ReportSection, ReportTableFrame } from "@/components/project/report/report-ui";

function statusBadgeStatus(status: string): "success" | "warning" | "danger" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized === "green") return "success";
  if (normalized === "amber" || normalized === "yellow") return "warning";
  if (normalized === "red") return "danger";
  return "neutral";
}

export function ReportModuleStatusUpdatesBody() {
  return (
    <div className="flex flex-col gap-4">
      <ReportSection title="Category status updates">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Counterparty</TableHeaderCell>
              <TableHeaderCell>GSDC Lead</TableHeaderCell>
              <TableHeaderCell>Last Update</TableHeaderCell>
              <TableHeaderCell>Current Update</TableHeaderCell>
              <TableHeaderCell>Next Milestone</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_STATUS_UPDATES.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap font-medium">{row.category}</TableCell>
                <TableCell>
                  <Badge status={statusBadgeStatus(row.status)} variant="subtle">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.counterparty}</TableCell>
                <TableCell className="whitespace-nowrap">{row.gsdcLead}</TableCell>
                <TableCell className="whitespace-nowrap">{row.lastUpdate}</TableCell>
                <TableCell className="min-w-[14rem]">{row.currentUpdate}</TableCell>
                <TableCell className="min-w-[12rem]">{row.nextMilestone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTableFrame>
      </ReportSection>
    </div>
  );
}
