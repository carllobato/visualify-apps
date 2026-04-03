const skeletonBar = "rounded-sm bg-[var(--ds-surface-muted)]";
const pulse = "animate-pulse";

type NeutralRiskaiLoadingProps = {
  /**
   * `route` — padded segment fallback (most RiskAI `loading.tsx` files).
   * `main` — `<main className="p-6">` for simulation routes.
   * `inset` — bordered block for in-page loading (e.g. snapshot hydrate).
   */
  variant?: "route" | "main" | "inset";
  srLabel?: string;
};

/** Thin horizontal stripes, full-width within the parent, top-aligned (no centered column). */
function LoadingStripes() {
  return (
    <div className={`${pulse} w-full space-y-2`} aria-hidden>
      <div className={`${skeletonBar} h-2 w-full`} />
      <div className={`${skeletonBar} h-2 w-[90%]`} />
      <div className={`${skeletonBar} h-2 w-[52%]`} />
    </div>
  );
}

export function NeutralRiskaiLoading({
  variant = "route",
  srLabel = "Loading",
}: NeutralRiskaiLoadingProps) {
  const inner = (
    <>
      <span className="sr-only">{srLabel}</span>
      <LoadingStripes />
    </>
  );

  if (variant === "main") {
    return (
      <main className="w-full min-w-0 p-6" aria-busy="true" aria-live="polite">
        {inner}
      </main>
    );
  }

  if (variant === "inset") {
    return (
      <div
        className="mt-0 w-full min-w-0 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6"
        aria-busy="true"
        aria-live="polite"
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      className="w-full min-w-0 px-4 pt-6 pb-8 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      {inner}
    </div>
  );
}
