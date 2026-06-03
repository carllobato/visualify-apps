"use client";

import { useState } from "react";
import { dsNativeSelectFieldClassName } from "@visualify/design-system";
import { REPORT_HISTORICAL_PERIODS } from "@/components/project/report/report-mock-data";

export function ReportHeaderReportingPeriodSelect() {
  const [periodId, setPeriodId] = useState(REPORT_HISTORICAL_PERIODS[0].id);

  return (
    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      <span className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-muted)]">
        Report date
      </span>
      <select
        id="report-header-period"
        className={`${dsNativeSelectFieldClassName(false)} h-8 min-w-[9.5rem] max-w-[12rem] border-0 py-0 pl-2.5 pr-8 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-button-secondary)] enabled:hover:bg-[var(--ds-surface-hover)] enabled:hover:shadow-[var(--ds-elevation-button-secondary-hover)]`}
        aria-label="Report date"
        value={periodId}
        onChange={(event) => setPeriodId(event.target.value)}
      >
        {REPORT_HISTORICAL_PERIODS.map((period) => (
          <option key={period.id} value={period.id}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}
