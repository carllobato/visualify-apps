import {
  ReportSkeletonBar,
  ReportSkeletonCard,
} from "@/components/loading/report-skeleton-primitives";

/** Lightweight placeholder while a lazy report tab chunk loads. */
export function ReportModuleTabLoadingSkeleton() {
  return (
    <div
      className="flex min-w-0 w-full flex-col gap-3"
      aria-busy="true"
      aria-label="Loading report view"
    >
      <ReportSkeletonCard contentClassName="flex min-h-[10rem] flex-col gap-3 px-4 py-6">
        <ReportSkeletonBar className="h-4 w-36" />
        <div className="flex flex-col gap-2">
          <ReportSkeletonBar className="h-3 w-full" />
          <ReportSkeletonBar className="h-3 w-[88%]" />
          <ReportSkeletonBar className="h-3 w-[62%]" />
        </div>
      </ReportSkeletonCard>
    </div>
  );
}
