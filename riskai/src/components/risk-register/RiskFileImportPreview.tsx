"use client";

import { useMemo } from "react";
import { Badge, Button, Callout } from "@visualify/design-system";
import type { ImportPreviewRow } from "@/domain/risk/fileImportPreview";
import {
  getImportPreviewSummary,
  normalizeImportTitleKey,
} from "@/domain/risk/fileImportPreview";

function duplicateWarning(row: ImportPreviewRow): string | null {
  if (!row.isDuplicate) return null;
  const parts: string[] = [];
  if (row.duplicateReasons.includes("existing_project")) {
    parts.push("matches an existing project risk");
  }
  if (row.duplicateReasons.includes("batch")) {
    parts.push("duplicate title in this file");
  }
  return parts.length > 0 ? `Possible duplicate: ${parts.join("; ")}` : "Possible duplicate";
}

export function RiskFileImportPreview({
  rows,
  selectedIds,
  onToggleRow,
  onSelectAllUnique,
  onClearSelection,
  onImportSelected,
  onBack,
  importDisabled,
}: {
  rows: ImportPreviewRow[];
  selectedIds: ReadonlySet<string>;
  onToggleRow: (id: string, selected: boolean) => void;
  onSelectAllUnique: () => void;
  onClearSelection: () => void;
  onImportSelected: () => void;
  onBack: () => void;
  importDisabled?: boolean;
}) {
  const summary = useMemo(() => getImportPreviewSummary(rows, selectedIds), [rows, selectedIds]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        <span>{summary.validCount} valid</span>
        <span aria-hidden>·</span>
        <span>{summary.duplicateCount} possible duplicate{summary.duplicateCount === 1 ? "" : "s"}</span>
        <span aria-hidden>·</span>
        <span>{summary.invalidCount} invalid</span>
        <span aria-hidden>·</span>
        <span className="font-medium text-[var(--ds-text-primary)]">
          {summary.selectedCount} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onSelectAllUnique}>
          Select all unique
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClearSelection}>
          Clear selection
        </Button>
      </div>

      <div className="max-h-[min(50vh,420px)] overflow-y-auto rounded-[var(--ds-radius-md)] border border-[var(--ds-border)]">
        <table className="w-full text-left text-[length:var(--ds-text-sm)]">
          <thead className="sticky top-0 z-[1] border-b border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
            <tr>
              <th scope="col" className="w-10 px-3 py-2 font-medium">
                <span className="sr-only">Import</span>
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Title
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                Details
              </th>
              <th scope="col" className="w-24 px-3 py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const warning = duplicateWarning(row);
              const checked = row.valid && selectedIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={
                    row.valid
                      ? "border-b border-[var(--ds-border-subtle)] last:border-b-0"
                      : "border-b border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_40%,transparent)] last:border-b-0"
                  }
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!row.valid}
                      onChange={(e) => onToggleRow(row.id, e.target.checked)}
                      aria-label={
                        row.valid
                          ? `Import ${row.title}`
                          : `Cannot import invalid row${row.title ? `: ${row.title}` : ""}`
                      }
                      className="h-4 w-4 rounded border-[var(--ds-border)] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-[var(--ds-text-primary)]">
                      {row.title || "(no title)"}
                    </div>
                    {!row.valid && row.invalidReason ? (
                      <p className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg)]">
                        {row.invalidReason}
                      </p>
                    ) : null}
                    {warning ? (
                      <Callout
                        status="warning"
                        className="!mt-2 !px-2 !py-1.5 text-[length:var(--ds-text-xs)]"
                        role="status"
                      >
                        {warning}
                        <span className="sr-only">
                          {" "}
                          (normalised key: {normalizeImportTitleKey(row.title)})
                        </span>
                      </Callout>
                    ) : null}
                    <p className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] sm:hidden">
                      {row.detail}
                    </p>
                  </td>
                  <td className="hidden px-3 py-2 align-top text-[var(--ds-text-secondary)] sm:table-cell">
                    {row.detail}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {row.valid ? (
                      <Badge status="neutral" variant="subtle">
                        Draft
                      </Badge>
                    ) : (
                      <Badge status="danger" variant="subtle">
                        Invalid
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onImportSelected}
          disabled={importDisabled || summary.selectedCount === 0}
        >
          Import selected ({summary.selectedCount})
        </Button>
      </div>
    </div>
  );
}
