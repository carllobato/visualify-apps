"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatReportProjectReportingDate,
  type ReportProjectReportingPeriod,
} from "@/lib/projects/report-project-reporting-date";

function IconChevronDownSubtle() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-[color-mix(in_oklab,var(--ds-text-secondary)_58%,transparent)] opacity-[0.85]"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ReportProjectReportingDateSelectProps = {
  id: string;
  periods: ReportProjectReportingPeriod[];
  value: string;
  onChange: (isoDate: string) => void;
};

export function ReportProjectReportingDateSelect({
  id,
  periods,
  value,
  onChange,
}: ReportProjectReportingDateSelectProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedPeriod = periods.find((period) => period.isoDate === value) ?? periods[0];
  const selectedLabel = selectedPeriod
    ? formatReportProjectReportingDate(selectedPeriod.isoDate)
    : "Reporting date";

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        id={id}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label={`Reporting date, ${selectedLabel}`}
        className="inline-flex items-center gap-1 rounded-[var(--ds-radius-sm)] font-normal text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <IconChevronDownSubtle />
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 top-full z-[100] mt-[var(--ds-space-1)] min-w-[11rem] ds-app-menu-dropdown"
        >
          {periods.map((period) => {
            const label = formatReportProjectReportingDate(period.isoDate);
            const isSelected = period.isoDate === value;

            return (
              <button
                key={period.isoDate}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="ds-app-menu-dropdown__item text-left"
                onClick={() => {
                  onChange(period.isoDate);
                  setMenuOpen(false);
                }}
              >
                {period.isLatest ? `${label} (Latest)` : label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
