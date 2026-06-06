import { Card, CardContent } from "@visualify/design-system";
import { REPORT_PROJECT_STAGE_DEFAULT } from "@/lib/projects/report-project-stages";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

type ReportProjectDetailsCardProps = {
  project: ReportProjectListItem;
};

function formatProjectDetail(value: string | null | undefined, fallback = "—"): string {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

function formatProjectCreatedAt(createdAt: string | null): string {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReportProjectDetailsCard({ project }: ReportProjectDetailsCardProps) {
  const rows = [
    { label: "Project code", value: formatProjectDetail(project.code) },
    { label: "Location", value: formatProjectDetail(project.location) },
    { label: "Stage", value: project.stage ?? REPORT_PROJECT_STAGE_DEFAULT },
    { label: "Created", value: formatProjectCreatedAt(project.createdAt) },
  ];

  return (
    <Card className="flex h-full w-full min-w-0 flex-col">
      <CardContent className="flex flex-1 flex-col px-4 py-3">
        <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Project details
        </p>
        <dl className="m-0 flex min-h-0 flex-1 flex-col divide-y divide-[var(--ds-border-subtle)]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-h-0 flex-1 items-center justify-between gap-4 py-2 text-[length:var(--ds-text-sm)] first:pt-0 last:pb-0"
            >
              <dt className="m-0 text-[var(--ds-text-secondary)]">{row.label}</dt>
              <dd className="m-0 text-right font-semibold text-[var(--ds-text-primary)]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
