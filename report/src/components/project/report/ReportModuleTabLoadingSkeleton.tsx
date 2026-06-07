import { Card, CardContent } from "@visualify/design-system";

const SKELETON_BAR_CLASS =
  "animate-pulse rounded-[var(--ds-radius-sm)] bg-[color-mix(in_oklab,var(--ds-border)_42%,transparent)]";

/** Lightweight placeholder while a lazy report tab chunk loads. */
export function ReportModuleTabLoadingSkeleton() {
  return (
    <div
      className="flex min-w-0 w-full flex-col gap-3"
      aria-busy="true"
      aria-label="Loading report view"
    >
      <Card>
        <CardContent className="flex min-h-[10rem] flex-col gap-3 px-4 py-6">
          <div className={`h-4 w-36 ${SKELETON_BAR_CLASS}`} />
          <div className="flex flex-col gap-2">
            <div className={`h-3 w-full ${SKELETON_BAR_CLASS}`} />
            <div className={`h-3 w-[88%] ${SKELETON_BAR_CLASS}`} />
            <div className={`h-3 w-[62%] ${SKELETON_BAR_CLASS}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
