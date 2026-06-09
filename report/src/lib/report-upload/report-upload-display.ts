import type { ReportSnapshotUploadUploader } from "@/lib/projects/report-snapshots-server";

const SYDNEY_TIME_ZONE = "Australia/Sydney";

export function formatReportUploadUploaderName(
  uploader: ReportSnapshotUploadUploader | null,
): string {
  const first = uploader?.firstName?.trim() ?? "";
  const last = uploader?.surname?.trim() ?? "";
  const fullName = `${first} ${last}`.trim();
  if (fullName.length > 0) {
    return fullName;
  }

  const email = uploader?.email?.trim();
  if (email) {
    return email;
  }

  return "Unknown User";
}

export function formatReportUploadTimestampSydney(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }

  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((segment) => segment.type === type)?.value ?? "";

  return `${part("hour")}:${part("minute")} ${part("day")}/${part("month")}/${part("year")} ${part("timeZoneName")}`;
}
