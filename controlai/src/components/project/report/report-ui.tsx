import type { ReactNode } from "react";
import { Table } from "@visualify/design-system";

export const reportSectionTitleClass =
  "m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]";

export function ReportSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 ${className}`.trim()} aria-label={title}>
      <h2 className={reportSectionTitleClass}>{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function ReportTableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)]">
      <Table>{children}</Table>
    </div>
  );
}

export function ReportChartPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="flex min-h-[12rem] flex-col items-center justify-center rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-6 text-center"
      role="img"
      aria-label={`${title} placeholder`}
    >
      <p className="m-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
        {title}
      </p>
      <p className="m-0 mt-1.5 max-w-lg text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
        {description}
      </p>
    </div>
  );
}
