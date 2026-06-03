import { TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@visualify/design-system";
import {
  REPORT_COST_CATEGORIES,
  REPORT_SUMMARY_SOURCES,
  REPORT_SUMMARY_USES,
} from "@/components/project/report/report-mock-data";
import { ReportSection, ReportTableFrame } from "@/components/project/report/report-ui";

export function ReportModuleFinancialBody() {
  return (
    <div className="flex flex-col gap-4">
      <ReportSection title="Cost Category">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Cost Category</TableHeaderCell>
              <TableHeaderCell>Approved Budget</TableHeaderCell>
              <TableHeaderCell>Current Forecast</TableHeaderCell>
              <TableHeaderCell>vs Budget</TableHeaderCell>
              <TableHeaderCell>Current Committed</TableHeaderCell>
              <TableHeaderCell>Current Uncommitted</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_COST_CATEGORIES.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="min-w-[10rem] font-medium">{row.costCategory}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.approvedBudget}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.currentForecast}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.vsBudget}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.currentCommitted}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.currentUncommitted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTableFrame>
      </ReportSection>

      <ReportSection title="Summary Uses">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Uses Category</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Committed</TableHeaderCell>
              <TableHeaderCell>Uncommitted</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_SUMMARY_USES.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.usesCategory}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.total}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.committed}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.uncommitted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTableFrame>
      </ReportSection>

      <ReportSection title="Summary Sources">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Source</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Undrawn</TableHeaderCell>
              <TableHeaderCell>Drawn</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_SUMMARY_SOURCES.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.source}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.total}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.undrawn}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.drawn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTableFrame>
      </ReportSection>
    </div>
  );
}
