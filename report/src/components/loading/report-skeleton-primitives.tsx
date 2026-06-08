import type { ReactNode } from "react";
import { Card, CardContent } from "@visualify/design-system";

export const reportSkeletonBarClassName =
  "animate-pulse rounded-[var(--ds-radius-sm)] bg-[color-mix(in_oklab,var(--ds-border)_42%,transparent)]";

type ReportSkeletonBarProps = {
  className?: string;
};

export function ReportSkeletonBar({ className = "" }: ReportSkeletonBarProps) {
  return <div className={`${reportSkeletonBarClassName} ${className}`.trim()} aria-hidden />;
}

type ReportSkeletonCardProps = {
  children: ReactNode;
  contentClassName?: string;
};

export function ReportSkeletonCard({ children, contentClassName = "px-4 py-4" }: ReportSkeletonCardProps) {
  return (
    <Card>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

type ReportSkeletonPageProps = {
  children: ReactNode;
  /** Screen-reader label for the loading region. */
  label: string;
  className?: string;
};

export function ReportSkeletonPage({ children, label, className = "" }: ReportSkeletonPageProps) {
  return (
    <div className={className} aria-busy="true" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
