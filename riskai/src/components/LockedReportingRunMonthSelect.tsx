"use client";

import { useEffect, useState } from "react";
import { dsNativeSelectFieldClassName } from "@visualify/design-system";
import {
  fetchLockedReportingSnapshotsByMonthForProject,
  type LockedReportingMonthOption,
} from "@/lib/db/lockedReportingMonths";
import { formatReportMonthLabel, type SimulationSnapshotRow } from "@/lib/db/snapshots";

type SnapshotRowNonNull = Exclude<SimulationSnapshotRow, null>;

export type LockedReportingRunMonthSelectProps = {
  projectId?: string | null;
  onSelectRow: (row: SnapshotRowNonNull) => void;
  disabled?: boolean;
};

/**
 * Choose a locked-for-reporting simulation by calendar month; hydrates via `onSelectRow` with the stored row.
 */
export function LockedReportingRunMonthSelect({
  projectId,
  onSelectRow,
  disabled,
}: LockedReportingRunMonthSelectProps) {
  const [options, setOptions] = useState<LockedReportingMonthOption[] | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [projectId]);

  useEffect(() => {
    const pid = projectId?.trim();
    if (!pid) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    void fetchLockedReportingSnapshotsByMonthForProject(pid).then((list) => {
      if (!cancelled) setOptions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (options === null) {
    return (
      <div
        className="h-10 min-w-[11rem] max-w-72 animate-pulse rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-muted)]"
        aria-hidden
      />
    );
  }

  if (options.length === 0) {
    return (
      <span className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">No locked reporting runs</span>
    );
  }

  return (
    <div className="flex min-w-0 items-center">
      <select
        className={`${dsNativeSelectFieldClassName(false)} min-w-[11rem] max-w-72 py-0 border-0 bg-[var(--ds-surface)] shadow-[var(--ds-elevation-button-secondary)] enabled:hover:bg-[var(--ds-surface-hover)] enabled:hover:shadow-[var(--ds-elevation-button-secondary-hover)] disabled:shadow-none disabled:hover:bg-[var(--ds-surface)]`}
        aria-label="Load locked reporting run by month"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (!next) return;
          const opt = options.find((o) => o.monthKey === next);
          if (opt) onSelectRow(opt.row);
        }}
      >
        <option value="">Month…</option>
        {options.map((o) => (
          <option key={o.monthKey} value={o.monthKey}>
            {formatReportMonthLabel(o.monthKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
