import { Card, CardContent } from "@visualify/design-system";
import type { ReactNode } from "react";
import { getReportOverviewCardClassName } from "@/lib/projects/report-project-overview-link";

type ReportProjectOverviewInteractiveCardProps = {
  highlighted?: boolean;
  hoverable?: boolean;
  navigateLabel?: string;
  onNavigate?: () => void;
  cardClassName?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function ReportProjectOverviewInteractiveCard({
  highlighted = false,
  hoverable = false,
  navigateLabel,
  onNavigate,
  cardClassName = "",
  contentClassName = "flex flex-1 flex-col px-4 py-3",
  children,
}: ReportProjectOverviewInteractiveCardProps) {
  const navigable = onNavigate != null;

  return (
    <Card
      className={getReportOverviewCardClassName(
        highlighted,
        ["relative flex h-full w-full min-w-0 flex-col", cardClassName].filter(Boolean).join(" "),
        navigable || hoverable,
      )}
    >
      {navigable ? (
        <button
          type="button"
          onClick={onNavigate}
          aria-label={navigateLabel}
          className="absolute inset-0 z-0 rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
        />
      ) : null}
      <CardContent
        className={[
          "relative z-10",
          navigable ? "pointer-events-none" : "",
          contentClassName,
        ].join(" ")}
      >
        {children}
      </CardContent>
    </Card>
  );
}
