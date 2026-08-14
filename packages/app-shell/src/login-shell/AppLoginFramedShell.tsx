import type { ReactNode } from "react";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellOuterCanvas,
  AppShellScrollBodyCentered,
  AppShellScrollRegion,
} from "../AppShellFrame";
import { AppLoginBrandMark } from "./AppLoginBrandMark";
import { AppLoginFramedSignedInRail } from "./AppLoginFramedSignedInRail";
import {
  appLoginFramedRailAsideClassName,
  appLoginFramedRailBrandLinkClassName,
  appLoginFramedShellClassName,
  appLoginFramedShellSignedInRailClassName,
  appLoginFramedRailStackClassName,
} from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginFramedShellProps = {
  children: ReactNode;
  /** Brand link target (usually app home / login entry). */
  brandHref?: string;
  /** `title` on the brand link. */
  brandTitle?: string;
  /** `aria-label` on the brand link; defaults to `brandTitle`. */
  brandAriaLabel?: string;
  /** Symbol asset URL (host app serves `public/visualify-brand-mark.png`). */
  brandMarkSrc?: string;
  /**
   * Account (and other) controls for the signed-in rail footer.
   * When set, the static login aside is replaced by the collapsible platform rail
   * (pin/open, Help, account). Signed-out login omits this.
   */
  railFooter?: ReactNode;
  /** Persist pin state; use the same key as the product’s signed-in rail. */
  railPinnedStorageKey?: string;
  className?: string;
};

/**
 * Low-level signed-out **frame** (platform canvas, collapsed brand rail, centered body slot).
 *
 * **Standard login routes:** use {@link AppLoginScreen} — it already includes this + {@link AppLoginPage}.
 * Do not copy this layout into app repos.
 *
 * **Allowed use:** atypical auth surfaces (e.g. MFA verify, workspace selection) that need the
 * rail/frame but not the full login card — still prefer shared primitives over bespoke cards.
 *
 * @see ./LOGIN_ARCHITECTURE.md
 */
export function AppLoginFramedShell({
  children,
  brandHref = "/",
  brandTitle = "Visualify",
  brandAriaLabel,
  brandMarkSrc,
  railFooter,
  railPinnedStorageKey,
  className,
}: AppLoginFramedShellProps) {
  const railLabel = brandAriaLabel ?? brandTitle;
  const signedInRail = railFooter != null;

  return (
    <AppShellOuterCanvas
      className={mergeClass(
        mergeClass(
          appLoginFramedShellClassName,
          signedInRail ? appLoginFramedShellSignedInRailClassName : undefined,
        ),
        className,
      )}
    >
      {signedInRail ? (
        <AppLoginFramedSignedInRail
          brandHref={brandHref}
          brandTitle={brandTitle}
          brandAriaLabel={railLabel}
          brandMarkSrc={brandMarkSrc}
          pinnedStorageKey={railPinnedStorageKey}
        >
          {railFooter}
        </AppLoginFramedSignedInRail>
      ) : (
        <aside className={appLoginFramedRailAsideClassName} aria-label="Visualify platform">
          <div className={appLoginFramedRailStackClassName}>
            <a
              href={brandHref}
              title={brandTitle}
              aria-label={railLabel}
              className={appLoginFramedRailBrandLinkClassName}
            >
              <AppLoginBrandMark src={brandMarkSrc} alt="" variant="rail" />
            </a>
          </div>
        </aside>
      )}

      <AppShellMainColumn>
        <AppShellFrameGutter>
          <AppShellFramedSurface>
            <AppShellScrollRegion>
              <AppShellScrollBodyCentered>{children}</AppShellScrollBodyCentered>
            </AppShellScrollRegion>
          </AppShellFramedSurface>
        </AppShellFrameGutter>
      </AppShellMainColumn>
    </AppShellOuterCanvas>
  );
}
