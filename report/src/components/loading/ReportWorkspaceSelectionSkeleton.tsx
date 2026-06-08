import "@/components/layout/report-mobile-pages.css";
import {
  ReportSkeletonBar,
  ReportSkeletonCard,
  ReportSkeletonPage,
} from "@/components/loading/report-skeleton-primitives";

/** Workspace picker placeholder for post-login and Suspense fallbacks. */
export function ReportWorkspaceSelectionSkeleton() {
  return (
    <ReportSkeletonPage
      label="Loading workspaces"
      className="report-mobile-page mx-auto flex w-full max-w-lg flex-col gap-4 py-8 max-md:mx-0 max-md:max-w-none max-md:py-0"
    >
      <div className="flex flex-col gap-2">
        <ReportSkeletonBar className="h-6 w-40 max-w-full" />
        <ReportSkeletonBar className="h-3.5 w-56 max-w-full" />
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index}>
            <ReportSkeletonCard contentClassName="flex h-auto min-h-[3.25rem] items-center px-4 py-3">
              <ReportSkeletonBar className="h-4 w-36 max-w-[75%]" />
            </ReportSkeletonCard>
          </li>
        ))}
      </ul>
    </ReportSkeletonPage>
  );
}
