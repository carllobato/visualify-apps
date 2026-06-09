"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Button, Callout, Card, CardContent } from "@visualify/design-system";
import {
  formatReportProjectReportingDate,
  type ReportProjectReportingPeriod,
} from "@/lib/projects/report-project-reporting-date";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import type { ReportSnapshotUploadRow } from "@/lib/projects/report-snapshots-server";
import type { ReportExcelParseError } from "@/lib/report-upload/parse-report-excel";
import {
  formatReportUploadTimestampSydney,
  formatReportUploadUploaderName,
} from "@/lib/report-upload/report-upload-display";

type ReportProjectUploadTabContentProps = {
  project: ReportProjectListItem;
  recentUploads?: ReportSnapshotUploadRow[];
  reportingPeriods?: ReportProjectReportingPeriod[];
  selectedReportingDate?: string | null;
};

type UploadErrorResponse = {
  ok?: false;
  errors?: ReportExcelParseError[];
  error?: string;
  requiresReplaceConfirmation?: boolean;
  reportingDate?: string;
  existingSnapshot?: {
    id: string;
    reportingDate: string;
    sourceFilename: string | null;
    uploadedAt: string;
  };
};

const REPORT_UPLOAD_TEMPLATE_PATH = "/templates/report-upload-template.xlsx";

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5v7M8 9.5l2.5-2.5M8 9.5L5.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 12.5h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFileSpreadsheet() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M6 2.5h5.5L15.5 6.5V16.5c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V3.5c0-.55.45-1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 2.5V6.5H15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10h6M7 12.5h6M7 15h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ReportHistoryPeriodStatus = "latest" | "active";

function getReportHistoryPeriodStatus(
  reportingDate: string,
  reportingPeriods: ReportProjectReportingPeriod[],
): ReportHistoryPeriodStatus {
  const period = reportingPeriods.find((entry) => entry.isoDate === reportingDate);
  return period?.isLatest ? "latest" : "active";
}

function isActiveReportHistoryUpload(
  reportingDate: string,
  reportingPeriods: ReportProjectReportingPeriod[],
): boolean {
  return reportingPeriods.some((period) => period.isoDate === reportingDate);
}

function reportHistoryStatusBadge(status: ReportHistoryPeriodStatus) {
  if (status === "latest") {
    return (
      <Badge status="info" variant="subtle">
        Latest
      </Badge>
    );
  }

  return (
    <Badge status="success" variant="subtle">
      Active
    </Badge>
  );
}

const DELETE_REPORT_DANGER_BUTTON_CLASS =
  "!border-[var(--ds-status-danger-strong-border)] !text-[var(--ds-status-danger-fg)] hover:!bg-[color-mix(in_oklab,var(--ds-status-danger)_8%,transparent)]";

export function ReportProjectUploadTabContent({
  project,
  recentUploads = [],
  reportingPeriods = [],
  selectedReportingDate = null,
}: ReportProjectUploadTabContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [archivingDate, setArchivingDate] = useState<string | null>(null);
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ReportExcelParseError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successDate, setSuccessDate] = useState<string | null>(null);
  const [replaceConfirmationDate, setReplaceConfirmationDate] = useState<string | null>(null);

  function resetFeedback() {
    setErrors([]);
    setGeneralError(null);
    setSuccessDate(null);
    setReplaceConfirmationDate(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    resetFeedback();
  }

  async function submitUpload(replace = false) {
    if (!selectedFile) {
      setGeneralError("Select an .xlsx file to upload.");
      return;
    }

    setLoading(true);
    setErrors([]);
    setGeneralError(null);
    setSuccessDate(null);
    if (!replace) {
      setReplaceConfirmationDate(null);
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (replace) {
        formData.append("replace", "true");
      }

      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}/report/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      const body = (await response.json()) as UploadErrorResponse & {
        ok?: true;
        reportingDate?: string;
      };

      if (body.requiresReplaceConfirmation && body.reportingDate) {
        setReplaceConfirmationDate(body.reportingDate);
        return;
      }

      if (!response.ok) {
        if (Array.isArray(body.errors) && body.errors.length > 0) {
          setErrors(body.errors);
        } else {
          setGeneralError(body.error ?? "Upload failed. Please try again.");
        }
        return;
      }

      const reportingDate = body.reportingDate ?? null;
      setSuccessDate(reportingDate);
      setReplaceConfirmationDate(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (reportingDate) {
        router.replace(`${pathname}?period=${reportingDate}`, { scroll: false });
      }
      router.refresh();
    } catch {
      setGeneralError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleUpload() {
    void submitUpload(false);
  }

  function handleReplaceConfirm() {
    void submitUpload(true);
  }

  function handleReplaceCancel() {
    setReplaceConfirmationDate(null);
  }

  function handleDeleteReportClick(reportingDate: string) {
    setArchiveError(null);
    setDeleteConfirmDate(reportingDate);
  }

  function handleDeleteReportCancel() {
    setDeleteConfirmDate(null);
    setArchiveError(null);
  }

  async function handleDeleteReportConfirm(reportingDate: string) {
    setArchivingDate(reportingDate);
    setArchiveError(null);

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}/report/${encodeURIComponent(reportingDate)}/archive`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      const body = (await response.json()) as {
        ok?: true;
        error?: string;
        latestRemainingReportingDate?: string | null;
      };

      if (!response.ok || !body.ok) {
        setArchiveError(body.error ?? "Could not delete report. Please try again.");
        return;
      }

      setDeleteConfirmDate(null);

      if (selectedReportingDate === reportingDate) {
        const latestRemaining = body.latestRemainingReportingDate ?? null;
        if (latestRemaining) {
          router.replace(`${pathname}?period=${latestRemaining}`, { scroll: false });
        } else {
          router.replace(pathname, { scroll: false });
        }
      }

      router.refresh();
    } catch {
      setArchiveError("Could not delete report. Please try again.");
    } finally {
      setArchivingDate(null);
    }
  }

  const errorsBySheet = errors.reduce<Record<string, ReportExcelParseError[]>>((groups, error) => {
    const sheet = error.sheet || "Workbook";
    groups[sheet] = groups[sheet] ?? [];
    groups[sheet].push(error);
    return groups;
  }, {});

  const hasUploadFeedback =
    replaceConfirmationDate != null ||
    generalError != null ||
    successDate != null ||
    Object.keys(errorsBySheet).length > 0;

  const visibleUploads = recentUploads.filter((upload) =>
    isActiveReportHistoryUpload(upload.reportingDate, reportingPeriods),
  );

  const deleteActionUploadIdByPeriod = new Map<string, string>();
  for (const upload of visibleUploads) {
    if (!deleteActionUploadIdByPeriod.has(upload.reportingDate)) {
      deleteActionUploadIdByPeriod.set(upload.reportingDate, upload.id);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-0 p-0">
          <div className="border-b border-[var(--ds-border-subtle)] px-4 py-4 sm:px-6">
            <p className="m-0 text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
              Upload report workbook
            </p>
            <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              Publish monthly report data to Overview, Project, and Cost from a completed Excel
              workbook.
            </p>
          </div>

          <div className="grid lg:grid-cols-2">
            <section className="flex flex-col gap-4 border-b border-[var(--ds-border-subtle)] px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-semibold text-[var(--ds-text-secondary)]"
                >
                  1
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                    Download the template
                  </p>
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                    Use this workbook to prepare your monthly report. Project and Cost sheets are
                    section dividers and are ignored during upload.
                  </p>
                </div>
              </div>
              <a
                href={REPORT_UPLOAD_TEMPLATE_PATH}
                download="report-upload-template.xlsx"
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-[var(--ds-radius-md)] border-0 bg-[var(--ds-surface)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)] no-underline shadow-[var(--ds-elevation-button-secondary)] transition-all duration-150 ease-out hover:bg-[var(--ds-surface-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)]"
              >
                <IconDownload />
                Download Excel template
              </a>
            </section>

            <section className="flex flex-col gap-4 px-4 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] text-[length:var(--ds-text-xs)] font-semibold text-[var(--ds-text-secondary)]"
                >
                  2
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                    Upload your workbook
                  </p>
                  <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                    Choose a completed .xlsx file, then upload to publish it to the dashboard.
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Choose report workbook (.xlsx)"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || replaceConfirmationDate != null}
                className={[
                  "flex w-full flex-col items-center gap-2 rounded-[var(--ds-radius-md)] border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 ease-out",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]",
                  "disabled:cursor-not-allowed disabled:opacity-[0.38]",
                  selectedFile
                    ? "border-[var(--ds-primary)] bg-[color-mix(in_oklab,var(--ds-primary)_6%,transparent)]"
                    : "border-[var(--ds-border)] bg-[var(--ds-surface-inset)] hover:border-[var(--ds-border-strong,var(--ds-border))] hover:bg-[var(--ds-surface-hover)]",
                ].join(" ")}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--ds-surface)] text-[var(--ds-text-secondary)] shadow-[var(--ds-elevation-button-secondary)]">
                  <IconFileSpreadsheet />
                </span>
                {selectedFile ? (
                  <>
                    <span className="m-0 max-w-full truncate text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                      {selectedFile.name}
                    </span>
                    <span className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      {formatFileSize(selectedFile.size)} · Click to choose a different file
                    </span>
                  </>
                ) : (
                  <>
                    <span className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                      Choose .xlsx file
                    </span>
                    <span className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                      or click to browse
                    </span>
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading || !selectedFile || replaceConfirmationDate != null}
                >
                  {loading ? "Uploading…" : "Upload workbook"}
                </Button>
                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      resetFeedback();
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </section>
          </div>

          {hasUploadFeedback ? (
          <div className="flex flex-col gap-3 border-t border-[var(--ds-border-subtle)] px-4 py-4 sm:px-6">
          {replaceConfirmationDate ? (
            <Callout status="warning" className="text-[length:var(--ds-text-sm)]">
              <div className="flex flex-col gap-3">
                <p className="m-0">
                  A report already exists for{" "}
                  {formatReportProjectReportingDate(replaceConfirmationDate)}. Uploading will replace
                  the current dashboard data.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={handleReplaceCancel} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleReplaceConfirm} disabled={loading}>
                    {loading ? "Replacing…" : "Replace report"}
                  </Button>
                </div>
              </div>
            </Callout>
          ) : null}

          {generalError ? (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {generalError}
            </Callout>
          ) : null}

          {successDate ? (
            <Callout status="success" className="text-[length:var(--ds-text-sm)]">
              Upload successful. Report data for {formatReportProjectReportingDate(successDate)} is now
              live on Overview, Project, and Cost.
            </Callout>
          ) : null}

          {Object.keys(errorsBySheet).length > 0 ? (
            <div className="flex flex-col gap-3">
              <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
                Validation errors — fix the workbook and try again.
              </Callout>
              {Object.entries(errorsBySheet).map(([sheet, sheetErrors]) => (
                <div key={sheet} className="flex flex-col gap-1">
                  <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                    {sheet}
                  </p>
                  <ul className="m-0 list-disc pl-5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                    {sheetErrors.map((error, index) => (
                      <li key={`${sheet}-${index}`}>
                        {error.column ? `${error.column}: ` : ""}
                        {error.row != null ? `Row ${error.row} — ` : ""}
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
          </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          <div className="flex flex-col gap-1">
            <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
              Report history
            </p>
            <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              Active reports for this project. Deleting a report removes it from the dashboard and
              this list.
            </p>
          </div>

          {archiveError ? (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {archiveError}
            </Callout>
          ) : null}

          {visibleUploads.length === 0 ? (
            <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              No active reports yet.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {visibleUploads.map((upload) => {
                const periodStatus = getReportHistoryPeriodStatus(
                  upload.reportingDate,
                  reportingPeriods,
                );
                const showDeleteAction = deleteActionUploadIdByPeriod.get(upload.reportingDate) === upload.id;
                const isConfirmingDelete =
                  showDeleteAction && deleteConfirmDate === upload.reportingDate;

                return (
                  <li
                    key={upload.id}
                    className="flex flex-col gap-2 rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] px-3 py-2"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                          {formatReportProjectReportingDate(upload.reportingDate)}
                        </p>
                        <p className="m-0 truncate text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                          {upload.sourceFilename ?? "Unknown file"}
                        </p>
                        <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                          {formatReportUploadUploaderName(upload.uploader)}
                        </p>
                        <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                          {formatReportUploadTimestampSydney(upload.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        {reportHistoryStatusBadge(periodStatus)}
                        {showDeleteAction && !isConfirmingDelete ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className={DELETE_REPORT_DANGER_BUTTON_CLASS}
                            onClick={() => handleDeleteReportClick(upload.reportingDate)}
                            disabled={archivingDate != null}
                          >
                            Delete report
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {showDeleteAction && isConfirmingDelete ? (
                      <div className="flex flex-col gap-2 border-t border-[var(--ds-border-subtle)] pt-2">
                        <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                          This will remove the report from the dashboard, period selector, and report
                          history.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleDeleteReportCancel}
                            disabled={archivingDate === upload.reportingDate}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className={DELETE_REPORT_DANGER_BUTTON_CLASS}
                            onClick={() => void handleDeleteReportConfirm(upload.reportingDate)}
                            disabled={archivingDate === upload.reportingDate}
                          >
                            {archivingDate === upload.reportingDate ? "Deleting…" : "Delete report"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
