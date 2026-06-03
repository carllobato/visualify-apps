import { TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@visualify/design-system";
import { REPORT_RISKS_ISSUES_TOP5 } from "@/components/project/report/report-mock-data";
import { ReportSection, ReportTableFrame } from "@/components/project/report/report-ui";

export function ReportModuleRisksIssuesBody() {
  return (
    <div className="flex flex-col gap-4">
      <ReportSection title="Key Risks & Issues (Top 5)">
        <ReportTableFrame>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Risk or Issue</TableHeaderCell>
              <TableHeaderCell>Likelihood</TableHeaderCell>
              <TableHeaderCell>Impact</TableHeaderCell>
              <TableHeaderCell>Mitigation or Comment</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORT_RISKS_ISSUES_TOP5.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="min-w-[12rem] font-medium">{row.riskOrIssue}</TableCell>
                <TableCell className="whitespace-nowrap">{row.likelihood}</TableCell>
                <TableCell className="whitespace-nowrap">{row.impact}</TableCell>
                <TableCell className="min-w-[16rem]">{row.mitigationOrComment}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTableFrame>
      </ReportSection>
    </div>
  );
}
