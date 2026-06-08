import "@/components/layout/report-mobile-pages.css";
import {
  ReportSkeletonBar,
  ReportSkeletonCard,
  ReportSkeletonPage,
} from "@/components/loading/report-skeleton-primitives";

function ReportProjectListItemSkeleton() {
  return (
    <>
      <div className="md:hidden">
        <ReportSkeletonCard contentClassName="flex h-auto min-h-[3.25rem] items-center justify-between gap-3 px-4 py-3">
          <ReportSkeletonBar className="h-4 w-40 max-w-[70%]" />
          <ReportSkeletonBar className="h-5 w-14 shrink-0" />
        </ReportSkeletonCard>
      </div>
      <div className="hidden md:block">
        <ReportSkeletonCard contentClassName="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <ReportSkeletonBar className="h-4 w-44 max-w-full" />
              <ReportSkeletonBar className="h-3 w-28 max-w-full" />
              <ReportSkeletonBar className="h-3 w-36 max-w-full" />
            </div>
            <ReportSkeletonBar className="h-3 w-3 shrink-0 rounded-full" />
          </div>
        </ReportSkeletonCard>
      </div>
    </>
  );
}

/** Projects list placeholder while the route segment loads. */
export function ReportProjectsListSkeleton() {
  return (
    <ReportSkeletonPage
      label="Loading projects"
      className="report-mobile-page mx-auto flex w-full max-w-2xl flex-col gap-6 md:py-8 max-md:mx-0 max-md:max-w-none"
    >
      <div className="flex flex-col gap-2">
        <ReportSkeletonBar className="h-6 w-28 max-w-full" />
        <ReportSkeletonBar className="h-3.5 w-52 max-w-full" />
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 md:gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <ReportProjectListItemSkeleton />
          </li>
        ))}
      </ul>
    </ReportSkeletonPage>
  );
}
