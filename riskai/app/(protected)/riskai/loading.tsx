import { Card, CardBody } from "@visualify/design-system";
import { PROJECT_TILE_LINK_CLASSES } from "@/components/dashboard/ProjectTile";

const skeletonBar = "rounded bg-[var(--ds-surface-muted)]";
const pulse = "animate-pulse";

const pageShellClass = "w-full px-4 py-10 sm:px-6";

const sectionTitleSkeletonClass = `${pulse} ${skeletonBar} mb-3 h-7 w-44 max-w-full rounded-md`;

function PortfolioRowSkeleton() {
  return (
    <div className={`${PROJECT_TILE_LINK_CLASSES} pointer-events-none cursor-default`} aria-hidden>
      <div className={`${pulse} ${skeletonBar} h-4 min-w-0 max-w-[min(100%,16rem)] flex-1`} />
      <div className={`${pulse} ${skeletonBar} h-3.5 w-[7.5rem] shrink-0`} />
    </div>
  );
}

function ProjectRowSkeleton() {
  return (
    <div className={`${PROJECT_TILE_LINK_CLASSES} pointer-events-none cursor-default`} aria-hidden>
      <div className={`${pulse} ${skeletonBar} h-4 min-w-0 max-w-[min(100%,16rem)] flex-1`} />
      <div className={`${pulse} ${skeletonBar} size-2 shrink-0 rounded-full`} />
    </div>
  );
}

/**
 * Shared route-level fallback for RiskAI in-app pages outside the project layout (dashboard, portfolios, project list, settings chrome, etc.).
 * Renders inside ProtectedShell only.
 */
export default function RiskaiRouteLoading() {
  return (
    <div className={pageShellClass} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <header className="mb-8">
        <div className="min-h-[2.5rem]">
          <div className={`${pulse} space-y-3`}>
            <div className={`${skeletonBar} h-8 w-[min(100%,22rem)] max-w-full rounded-md`} />
            <div className={`${skeletonBar} h-3.5 w-[min(100%,15rem)] max-w-full`} />
          </div>
        </div>
      </header>

      <section className="mb-10" aria-hidden>
        <Card variant="inset" className="mb-10 overflow-hidden">
          <CardBody className="py-4 sm:py-5">
            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4 ${pulse}`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2 sm:items-start">
                  <div className={`${skeletonBar} h-3 w-20 max-w-full`} />
                  <div className={`${skeletonBar} h-7 w-14 max-w-full rounded-md`} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className={sectionTitleSkeletonClass} />
        <ul className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <PortfolioRowSkeleton />
            </li>
          ))}
        </ul>
      </section>

      <section aria-hidden>
        <div className={sectionTitleSkeletonClass} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ProjectRowSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
