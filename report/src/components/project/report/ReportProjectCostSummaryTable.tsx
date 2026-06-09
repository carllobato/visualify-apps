"use client";

import { useState } from "react";
import "./report-project-cost-summary-table.css";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";
import {
  buildReportCostSummaryCategoryRows,
  formatReportCostSummaryAmount,
  formatReportCostSummaryTotalAmount,
  formatReportCostSummaryTotalVarianceAmount,
  formatReportCostSummaryVarianceAmount,
  formatReportCostSummaryWbsCode,
  getReportCostSummaryAmountToneClass,
  getReportCostSummaryUncommittedAmount,
  getReportCostSummaryVarianceAmount,
  getReportCostSummaryVarianceToneClass,
  sumReportCostSummaryCategoryRows,
  type ReportProjectCostSummaryCategoryRow,
  type ReportProjectCostSummaryData,
} from "@/lib/projects/report-project-cost-summary";
import { REPORT_PROJECT_COST_SECTION_TITLE_CLASS } from "@/components/project/report/report-project-cost-section-title";
import { getReportOverviewCardClassName } from "@/lib/projects/report-project-overview-link";
import {
  getReportCostSummaryColumnBorderClass,
  getReportCostSummaryColumnFillClass,
  type ReportCostSummaryColumnBorderSegment,
  type ReportCostSummaryHighlightColumn,
} from "@/lib/projects/report-project-cost-links";

const SUMMARY_TABLE_CELL_CLASS = "!py-0 !px-1.5 align-middle";
const SUMMARY_TABLE_HEADER_CELL_CLASS = "!py-0.5 !px-1.5 align-middle";
const SUMMARY_TABLE_ROW_CLASS = "group h-8 [&>td]:!py-0";
const SUMMARY_TABLE_DATA_ROW_CLASS = [
  SUMMARY_TABLE_ROW_CLASS,
  "cursor-pointer transition-colors hover:bg-[var(--ds-surface-hover)]",
].join(" ");
const SUMMARY_TABLE_DATA_ROW_SELECTED_CLASS = "bg-[var(--ds-surface-hover)]";
const SUMMARY_CODE_CELL_CLASS = `${SUMMARY_TABLE_CELL_CLASS} w-[120px] max-w-[120px] whitespace-nowrap`;
const SUMMARY_DESCRIPTION_CELL_CLASS = `${SUMMARY_TABLE_CELL_CLASS} min-w-0 max-md:min-w-[14rem] max-md:w-[14rem]`;
const SUMMARY_DESCRIPTION_HEADER_CLASS = `${SUMMARY_TABLE_HEADER_CELL_CLASS} min-w-0 max-md:min-w-[14rem] max-md:w-[14rem]`;
const SUMMARY_AMOUNT_CELL_CLASS = `${SUMMARY_TABLE_CELL_CLASS} w-[9rem] max-w-[9rem] text-right`;
const SUMMARY_AMOUNT_HEADER_CLASS = `${SUMMARY_TABLE_HEADER_CELL_CLASS} w-[9rem] max-w-[9rem] text-right`;
const SUMMARY_TABLE_SCROLL_CLASS = "min-w-0 overflow-x-auto max-md:overscroll-x-contain";
const SUMMARY_TABLE_CLASS =
  "w-full table-fixed !border-separate border-spacing-0 text-[length:var(--ds-text-xs)] max-md:min-w-[66.5rem] [&_tbody_tr:last-child_td:first-child]:rounded-bl-[var(--ds-radius-md)] [&_tbody_tr:last-child_td:last-child]:rounded-br-[var(--ds-radius-md)] [&_th]:!py-0.5 [&_td]:!py-0";
const SUMMARY_TABLE_HEAD_CLASS =
  "!border-b-0 !bg-transparent [&_th]:border-b [&_th]:border-[var(--ds-border-subtle)] [&_th]:bg-[var(--ds-surface-muted)] [&_th:first-child]:rounded-tl-[var(--ds-radius-md)] [&_th:last-child]:rounded-tr-[var(--ds-radius-md)]";
const SUMMARY_TABLE_BODY_CLASS =
  "[&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-[var(--ds-border-subtle)]";
const SUMMARY_STATIC_VALUE_CLASS =
  "flex h-8 max-h-8 min-h-8 items-center text-[length:var(--ds-text-xs)] leading-snug";
const SUMMARY_PROJECT_TOTAL_ROW_CLASS = `${SUMMARY_TABLE_ROW_CLASS} h-9 cursor-default bg-[var(--ds-surface-muted)] [&>td]:!py-1`;

function summaryColumnCellClass(
  column: ReportCostSummaryHighlightColumn,
  segment: ReportCostSummaryColumnBorderSegment,
  highlightedColumn: ReportCostSummaryHighlightColumn | undefined,
  options: {
    row?: ReportProjectCostSummaryCategoryRow;
    highlightedRowFilter?: (row: ReportProjectCostSummaryCategoryRow) => boolean;
  } = {},
): string {
  const { row, highlightedRowFilter } = options;

  return [
    getReportCostSummaryColumnBorderClass(column, segment, highlightedColumn),
    getReportCostSummaryColumnFillClass(column, highlightedColumn, {
      row,
      highlightedRowFilter,
      segment,
    }),
  ]
    .filter(Boolean)
    .join(" ");
}

type ReportProjectCostSummaryTableRowProps = {
  row: ReportProjectCostSummaryCategoryRow;
  currencySymbol: string;
  isSelected: boolean;
  onSelect: (rowKey: string) => void;
  highlightedColumn?: ReportCostSummaryHighlightColumn;
  highlightedRowFilter?: (row: ReportProjectCostSummaryCategoryRow) => boolean;
};

function ReportProjectCostSummaryTableRow({
  row,
  currencySymbol,
  isSelected,
  onSelect,
  highlightedColumn,
  highlightedRowFilter,
}: ReportProjectCostSummaryTableRowProps) {
  const varianceAmount = getReportCostSummaryVarianceAmount(
    row.approvedBudget,
    row.currentForecast,
  );
  const uncommittedAmount = getReportCostSummaryUncommittedAmount(
    row.currentForecast,
    row.currentCommitted,
  );

  return (
    <TableRow
      className={[
        SUMMARY_TABLE_DATA_ROW_CLASS,
        isSelected ? SUMMARY_TABLE_DATA_ROW_SELECTED_CLASS : "",
      ].join(" ")}
      aria-selected={isSelected}
      onClick={() => onSelect(row.rowKey)}
    >
      <TableCell className={SUMMARY_CODE_CELL_CLASS}>
        <span className={`${SUMMARY_STATIC_VALUE_CLASS} font-medium text-[var(--ds-text-primary)]`}>
          {formatReportCostSummaryWbsCode(row.wbsCode)}
        </span>
      </TableCell>
      <TableCell className={SUMMARY_DESCRIPTION_CELL_CLASS}>
        <span className={`${SUMMARY_STATIC_VALUE_CLASS} font-medium text-[var(--ds-text-primary)]`}>
          {row.wbsDescription}
        </span>
      </TableCell>
      <TableCell
        className={[
          SUMMARY_AMOUNT_CELL_CLASS,
          summaryColumnCellClass("approved-budget", "body", highlightedColumn, {
            row,
            highlightedRowFilter,
          }),
        ].join(" ")}
      >
        <span
          className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${getReportCostSummaryAmountToneClass(row.approvedBudget)}`}
        >
          {formatReportCostSummaryAmount(row.approvedBudget, currencySymbol)}
        </span>
      </TableCell>
      <TableCell
        className={[
          SUMMARY_AMOUNT_CELL_CLASS,
          summaryColumnCellClass("current-forecast", "body", highlightedColumn, {
            row,
            highlightedRowFilter,
          }),
        ].join(" ")}
      >
        <span
          className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${getReportCostSummaryAmountToneClass(row.currentForecast)}`}
        >
          {formatReportCostSummaryAmount(row.currentForecast, currencySymbol)}
        </span>
      </TableCell>
      <TableCell className={SUMMARY_AMOUNT_CELL_CLASS}>
        <span
          className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${getReportCostSummaryVarianceToneClass(varianceAmount)}`}
        >
          {formatReportCostSummaryVarianceAmount(varianceAmount, currencySymbol)}
        </span>
      </TableCell>
      <TableCell className={SUMMARY_AMOUNT_CELL_CLASS}>
        <span
          className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${getReportCostSummaryAmountToneClass(row.currentCommitted)}`}
        >
          {formatReportCostSummaryAmount(row.currentCommitted, currencySymbol)}
        </span>
      </TableCell>
      <TableCell className={SUMMARY_AMOUNT_CELL_CLASS}>
        <span
          className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${getReportCostSummaryAmountToneClass(uncommittedAmount)}`}
        >
          {formatReportCostSummaryAmount(uncommittedAmount, currencySymbol)}
        </span>
      </TableCell>
    </TableRow>
  );
}

type ReportProjectCostSummaryTableProps = {
  summary: ReportProjectCostSummaryData;
  currencySymbol?: string;
  highlightedColumn?: ReportCostSummaryHighlightColumn;
  highlightedRowFilter?: (row: ReportProjectCostSummaryCategoryRow) => boolean;
};

export function ReportProjectCostSummaryTable({
  summary,
  currencySymbol = "$",
  highlightedColumn,
  highlightedRowFilter,
}: ReportProjectCostSummaryTableProps) {
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const categoryRows = buildReportCostSummaryCategoryRows(summary.wbsOptions, summary.directRows);
  const projectTotals = sumReportCostSummaryCategoryRows(categoryRows);
  const projectVarianceAmount = getReportCostSummaryVarianceAmount(
    projectTotals.approvedBudget,
    projectTotals.currentForecast,
  );
  const projectUncommittedAmount = getReportCostSummaryUncommittedAmount(
    projectTotals.currentForecast,
    projectTotals.currentCommitted,
  );

  return (
    <Card
      className={getReportOverviewCardClassName(false, "w-full min-w-0", true)}
      aria-label="Summary"
    >
      <CardContent className="flex flex-col p-0">
        <p className={REPORT_PROJECT_COST_SECTION_TITLE_CLASS}>Summary</p>
        <div className="overflow-hidden rounded-[var(--ds-radius-md)] p-[2px]">
          <div className={SUMMARY_TABLE_SCROLL_CLASS}>
            <Table className={SUMMARY_TABLE_CLASS}>
          <TableHead className={SUMMARY_TABLE_HEAD_CLASS}>
            <TableRow className={SUMMARY_TABLE_ROW_CLASS}>
              <TableHeaderCell
                className={`${SUMMARY_TABLE_HEADER_CELL_CLASS} w-[120px] max-w-[120px] whitespace-nowrap`}
              >
                WBS Code
              </TableHeaderCell>
              <TableHeaderCell className={SUMMARY_DESCRIPTION_HEADER_CLASS}>
                WBS Description
              </TableHeaderCell>
              <TableHeaderCell
                className={[
                  SUMMARY_AMOUNT_HEADER_CLASS,
                  summaryColumnCellClass("approved-budget", "header", highlightedColumn, {
                    highlightedRowFilter,
                  }),
                ].join(" ")}
              >
                Budget
              </TableHeaderCell>
              <TableHeaderCell
                className={[
                  SUMMARY_AMOUNT_HEADER_CLASS,
                  summaryColumnCellClass("current-forecast", "header", highlightedColumn, {
                    highlightedRowFilter,
                  }),
                ].join(" ")}
              >
                Forecast
              </TableHeaderCell>
              <TableHeaderCell className={SUMMARY_AMOUNT_HEADER_CLASS}>vs Budget</TableHeaderCell>
              <TableHeaderCell className={SUMMARY_AMOUNT_HEADER_CLASS}>
                Committed
              </TableHeaderCell>
              <TableHeaderCell className={SUMMARY_AMOUNT_HEADER_CLASS}>
                Uncommitted
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody className={SUMMARY_TABLE_BODY_CLASS}>
            {categoryRows.length === 0 ? (
              <TableRow className={SUMMARY_TABLE_ROW_CLASS}>
                <TableCell
                  colSpan={7}
                  className={`${SUMMARY_TABLE_CELL_CLASS} py-4 text-center text-[var(--ds-text-secondary)]`}
                >
                  No WBS categories configured for this project.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {categoryRows.map((row) => (
                  <ReportProjectCostSummaryTableRow
                    key={row.rowKey}
                    row={row}
                    currencySymbol={currencySymbol}
                    isSelected={selectedRowKey === row.rowKey}
                    onSelect={setSelectedRowKey}
                    highlightedColumn={highlightedColumn}
                    highlightedRowFilter={highlightedRowFilter}
                  />
                ))}
                <TableRow className={SUMMARY_PROJECT_TOTAL_ROW_CLASS}>
                  <TableCell className={SUMMARY_CODE_CELL_CLASS} colSpan={2}>
                    <span
                      className={`${SUMMARY_STATIC_VALUE_CLASS} text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]`}
                    >
                      Project total
                    </span>
                  </TableCell>
                  <TableCell
                    className={[
                      SUMMARY_AMOUNT_CELL_CLASS,
                      summaryColumnCellClass("approved-budget", "footer", highlightedColumn, {
                        highlightedRowFilter,
                      }),
                    ].join(" ")}
                  >
                    <span
                      className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end text-[length:var(--ds-text-sm)] font-semibold tabular-nums ${getReportCostSummaryAmountToneClass(projectTotals.approvedBudget)}`}
                    >
                      {formatReportCostSummaryTotalAmount(projectTotals.approvedBudget, currencySymbol)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={[
                      SUMMARY_AMOUNT_CELL_CLASS,
                      summaryColumnCellClass("current-forecast", "footer", highlightedColumn, {
                        highlightedRowFilter,
                      }),
                    ].join(" ")}
                  >
                    <span
                      className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end text-[length:var(--ds-text-sm)] font-semibold tabular-nums ${getReportCostSummaryAmountToneClass(projectTotals.currentForecast)}`}
                    >
                      {formatReportCostSummaryTotalAmount(projectTotals.currentForecast, currencySymbol)}
                    </span>
                  </TableCell>
                  <TableCell className={SUMMARY_AMOUNT_CELL_CLASS}>
                    <span
                      className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end text-[length:var(--ds-text-sm)] font-semibold tabular-nums ${getReportCostSummaryVarianceToneClass(projectVarianceAmount)}`}
                    >
                      {formatReportCostSummaryTotalVarianceAmount(projectVarianceAmount, currencySymbol)}
                    </span>
                  </TableCell>
                  <TableCell className={SUMMARY_AMOUNT_CELL_CLASS}>
                    <span
                      className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end text-[length:var(--ds-text-sm)] font-semibold tabular-nums ${getReportCostSummaryAmountToneClass(projectTotals.currentCommitted)}`}
                    >
                      {formatReportCostSummaryTotalAmount(projectTotals.currentCommitted, currencySymbol)}
                    </span>
                  </TableCell>
                  <TableCell className={SUMMARY_AMOUNT_CELL_CLASS}>
                    <span
                      className={`${SUMMARY_STATIC_VALUE_CLASS} w-full justify-end text-[length:var(--ds-text-sm)] font-semibold tabular-nums ${getReportCostSummaryAmountToneClass(projectUncommittedAmount)}`}
                    >
                      {formatReportCostSummaryTotalAmount(projectUncommittedAmount, currencySymbol)}
                    </span>
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
          </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
