import { Card, CardBody } from "@visualify/design-system";

const skeletonBar = "rounded bg-[var(--ds-surface-muted)]";
const pulse = "animate-pulse";

const overviewShellClass =
  "min-h-full w-full bg-[var(--ds-background)] p-6 text-[var(--ds-text-primary)]";

function ChartPanelSkeleton() {
  return (
    <Card variant="elevated" className="flex flex-col gap-3">
      <CardBody className="p-5">
        <div className={`${pulse} space-y-3`}>
          <div className={`${skeletonBar} h-3 w-36 max-w-full`} />
          <div className="flex min-h-[200px] w-full flex-col justify-end rounded-[var(--ds-radius-sm)] border border-[var(--ds-chart-panel-border)] bg-[var(--ds-chart-surface)] p-3">
            <div className={`${pulse} ${skeletonBar} h-[120px] w-full rounded-sm opacity-[0.55]`} />
            <div className={`mt-3 flex justify-between gap-2 ${pulse}`}>
              <div className={`${skeletonBar} h-2 w-12`} />
              <div className={`${skeletonBar} h-2 w-10`} />
              <div className={`${skeletonBar} h-2 w-14`} />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function KpiCardSkeleton({ wideMetric }: { wideMetric?: boolean }) {
  return (
    <Card variant="elevated">
      <CardBody className="p-5">
        <div className={`${pulse} space-y-3`}>
          <div className={`${skeletonBar} h-3 w-[7.5rem] max-w-full`} />
          <div className={`${skeletonBar} h-9 ${wideMetric ? "w-32" : "w-24"} max-w-full`} />
          <div className={`${skeletonBar} h-3 w-[min(100%,11rem)] max-w-full`} />
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Project inner-route fallback: layout (PageHeader + providers) stays mounted; only the page slot suspends.
 * Mirrors overview-style grids (KPI row, dual charts, buffers, insights) so simulation/overview navigations feel familiar.
 */
export default function ProjectRouteLoading() {
  return (
    <main className={overviewShellClass} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading project page</span>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton wideMetric />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartPanelSkeleton />
        <ChartPanelSkeleton />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} variant="elevated">
            <CardBody className="p-5">
              <div className={`${pulse} space-y-3`}>
                <div className={`${skeletonBar} h-3 w-44 max-w-full`} />
                <div className={`${skeletonBar} h-8 w-28 max-w-full`} />
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--ds-surface-muted)]">
                  <div className={`${skeletonBar} h-full w-[55%] rounded-full`} />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} variant="elevated">
            <CardBody className="p-5">
              <div className={`${pulse} space-y-2`}>
                <div className={`${skeletonBar} h-3 w-24 max-w-full`} />
                <div className={`${skeletonBar} h-4 w-full max-w-[18rem]`} />
                <div className={`${skeletonBar} h-3 w-[min(100%,12rem)] max-w-full`} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </main>
  );
}
