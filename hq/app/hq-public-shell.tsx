import Link from "next/link";

/**
 * Signed-out HQ chrome: same outer canvas and framed workspace as {@link HqSignedInShell},
 * with a minimal collapsed-width rail (brand only) — no platform nav or account controls.
 */
export function HqPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[color-mix(in_oklab,var(--ds-surface-muted)_24%,var(--ds-canvas))] text-[var(--ds-text-primary)]">
      <aside
        className="relative z-30 flex w-[68px] shrink-0 flex-col self-stretch overflow-visible rounded-br-[var(--ds-radius-lg)] rounded-tr-[var(--ds-radius-lg)] bg-transparent"
        aria-label="Visualify platform"
      >
        <div className="flex flex-col gap-2.5 px-[14px] pt-5">
          <Link
            href="/"
            title="Visualify HQ"
            aria-label="Visualify HQ"
            className={
              "flex h-10 w-full min-w-0 items-center justify-center rounded-[var(--ds-radius-md)] no-underline " +
              "transition-colors duration-[400ms] ease-out " +
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]"
            }
          >
            <span
              className={
                "flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] border-[length:0.5px] border-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] " +
                "bg-[var(--ds-surface)] text-[length:13px] font-semibold leading-none tracking-tight text-[var(--ds-text-primary)] " +
                "transition-colors hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_4%,var(--ds-surface))]"
              }
            >
              V
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <div className="box-border flex min-h-0 flex-1 flex-col p-2 sm:p-2.5">
          <div
            className={
              "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[var(--ds-radius-app-frame)] " +
              "bg-[var(--ds-surface)] shadow-[var(--ds-elevation-app-frame)]"
            }
          >
            <div className="box-border flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--ds-surface)] px-2.5 py-3 sm:px-4 sm:py-4">
              <div className="flex min-h-full flex-col items-center justify-center">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
