import { Card, CardBody } from "@visualify/design-system";

type LoadingPlaceholderProps = {
  className?: string;
  /** Announced to screen readers (visual is skeleton-only). */
  label?: string;
};

const skeletonBar = "h-3.5 rounded bg-[var(--ds-surface-muted)]";

/**
 * Consistent loading UI: muted inset card with pulse skeleton bars (no raw “Loading…” text).
 */
export function LoadingPlaceholder({ className = "", label = "Loading" }: LoadingPlaceholderProps) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <Card variant="inset" className="overflow-hidden">
        <CardBody className="py-6">
          <div className="animate-pulse space-y-3">
            <div className={`${skeletonBar} w-48 max-w-full`} />
            <div className={`${skeletonBar} w-32 max-w-full`} />
            <div className={`${skeletonBar} w-56 max-w-full`} />
          </div>
        </CardBody>
      </Card>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Minimal inline / Suspense fallback: compact skeleton strip. */
export function LoadingPlaceholderCompact({ className = "", label = "Loading" }: LoadingPlaceholderProps) {
  return (
    <div className={`flex justify-center py-6 ${className}`.trim()} aria-busy="true" aria-live="polite">
      <div className="w-full max-w-xs animate-pulse space-y-2">
        <div className={`${skeletonBar} mx-auto w-3/4`} />
        <div className={`${skeletonBar} mx-auto w-1/2`} />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
