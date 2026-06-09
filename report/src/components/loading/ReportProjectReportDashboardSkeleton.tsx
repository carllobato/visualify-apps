import { appShellPageTitleClassName, shellPageHeaderRailRowClassName } from "@visualify/app-shell";
import {
  ReportSkeletonBar,
  ReportSkeletonCard,
  ReportSkeletonPage,
} from "@/components/loading/report-skeleton-primitives";

function ReportDashboardWidgetSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <ReportSkeletonCard contentClassName={`flex flex-col gap-3 px-4 ${tall ? "min-h-[10rem] py-5" : "py-4"}`}>
      <ReportSkeletonBar className="h-4 w-32 max-w-full" />
      <div className="flex flex-col gap-2">
        <ReportSkeletonBar className="h-3 w-full" />
        <ReportSkeletonBar className="h-3 w-[88%]" />
        <ReportSkeletonBar className="h-3 w-[62%]" />
      </div>
    </ReportSkeletonCard>
  );
}

/** Report dashboard placeholder while the project report route loads. */
export function ReportProjectReportDashboardSkeleton() {
  return (
    <ReportSkeletonPage
      label="Loading project report"
      className="report-project-page flex min-h-0 min-w-0 flex-col max-md:overflow-x-visible"
    >
      <header className="flex shrink-0 flex-col gap-1 max-md:gap-0">
        <div className="flex flex-col gap-y-1 max-md:min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <div className={`${shellPageHeaderRailRowClassName} max-md:h-auto max-md:min-h-0`}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 max-md:gap-x-1.5">
              <div
                className={[
                  "min-w-0",
                  appShellPageTitleClassName,
                  "max-md:!text-[length:var(--ds-text-lg)] max-md:!font-medium max-md:!leading-snug",
                ].join(" ")}
              >
                <ReportSkeletonBar className="h-6 w-48 max-w-full max-md:h-5" />
              </div>
              <ReportSkeletonBar className="h-4 w-24 max-w-full max-md:h-3.5" />
            </div>
          </div>
          <div
            className={[
              shellPageHeaderRailRowClassName,
              "shrink-0 justify-end max-md:justify-start gap-2 max-md:h-auto max-md:min-h-0 max-md:w-full max-md:min-w-0",
              "max-md:overflow-x-auto max-md:overflow-y-hidden",
            ].join(" ")}
          >
            {Array.from({ length: 4 }, (_, index) => (
              <ReportSkeletonBar key={index} className="h-8 w-16 shrink-0 rounded-[var(--ds-radius-md)]" />
            ))}
          </div>
        </div>
        <div className="h-px w-full shrink-0 bg-[var(--ds-border-subtle)]" role="separator" aria-hidden />
      </header>

      <div className="report-project-page-body min-h-0 min-w-0 md:pt-1 md:pb-4">
        <div className="flex w-full min-w-0 flex-col">
          <div className="min-w-0 w-full pt-4 max-md:overflow-x-visible max-md:pt-2">
            <div className="report-project-overview-stack flex min-w-0 w-full flex-col gap-3">
              <ReportSkeletonCard contentClassName="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
                {Array.from({ length: 5 }, (_, index) => (
                  <ReportSkeletonBar
                    key={index}
                    className="h-8 w-24 shrink-0 rounded-[var(--ds-radius-md)] max-md:h-7 max-md:w-20"
                  />
                ))}
              </ReportSkeletonCard>

              <ReportSkeletonCard contentClassName="flex min-h-[8.5rem] flex-col gap-4 px-4 py-4 sm:min-h-[9.5rem]">
                <ReportSkeletonBar className="h-4 w-40 max-w-full" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="flex flex-col gap-2 rounded-[var(--ds-radius-md)] p-2">
                      <ReportSkeletonBar className="h-3 w-16 max-w-full" />
                      <ReportSkeletonBar className="h-6 w-10 max-w-full" />
                    </div>
                  ))}
                </div>
              </ReportSkeletonCard>

              <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="flex min-w-0 flex-col lg:w-1/2">
                  <ReportDashboardWidgetSkeleton tall />
                </div>
                <div className="flex min-w-0 flex-col lg:w-1/2">
                  <ReportDashboardWidgetSkeleton tall />
                </div>
              </div>

              <div className="flex min-w-0 w-full flex-col gap-3 lg:flex-row lg:items-stretch">
                <div className="flex min-w-0 flex-col lg:w-1/3">
                  <ReportDashboardWidgetSkeleton />
                </div>
                <div className="flex min-w-0 flex-col lg:w-1/3">
                  <ReportDashboardWidgetSkeleton />
                </div>
                <div className="flex min-w-0 flex-col lg:w-1/3">
                  <ReportDashboardWidgetSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReportSkeletonPage>
  );
}
