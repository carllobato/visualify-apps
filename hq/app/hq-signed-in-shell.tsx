import { PlatformRail } from "./platform-rail";

/**
 * Full-height signed-in shell: quiet outer background, platform rail in flow beside
 * the workspace — rail width transitions on hover and the main column flexes to match.
 */
export function HqSignedInShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[color-mix(in_oklab,var(--ds-surface-muted)_24%,var(--ds-canvas))] text-[var(--ds-text-primary)]">
      <PlatformRail />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <div className="box-border flex min-h-0 flex-1 flex-col p-2 sm:p-2.5">
          <div
            className={
              "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[var(--ds-radius-app-frame)] " +
              "bg-[var(--ds-surface)] shadow-[var(--ds-elevation-app-frame)]"
            }
          >
            <div className="box-border min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--ds-surface)] px-2.5 py-3 sm:px-4 sm:py-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
