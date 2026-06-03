import { TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@visualify/design-system";
import { REPORT_CASHFLOW_PROGRAMME } from "@/components/project/report/report-mock-data";
import { ReportChartPlaceholder, ReportSection, ReportTableFrame } from "@/components/project/report/report-ui";

export function ReportModuleCashflowBody() {
  const cashflow = REPORT_CASHFLOW_PROGRAMME;

  return (
    <div className="flex flex-col gap-4">
      <ReportSection title="Cashflow">
        <ReportChartPlaceholder
          title="Cashflow chart"
          description="Monthly committed vs expenditure will be charted here from the GreenSquare New Cover 2 workbook. Mock placeholder only."
        />
      </ReportSection>

      <ReportSection title="Programme & expenditure">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Row</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Programme period</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{cashflow.programmePeriod}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Committed</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{cashflow.committed}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Expenditure</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{cashflow.expenditure}</TableCell>
            </TableRow>
          </TableBody>
        </ReportTableFrame>
      </ReportSection>
    </div>
  );
}
