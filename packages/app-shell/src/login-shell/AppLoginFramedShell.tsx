import type { ReactNode } from "react";
import "../app-login-shell.css";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellOuterCanvas,
  AppShellScrollBodyCentered,
  AppShellScrollRegion,
} from "../AppShellFrame";
import { AppLoginBrandMark } from "./AppLoginBrandMark";
import {
  appLoginFramedRailAsideClassName,
  appLoginFramedRailBrandLinkClassName,
  appLoginFramedRailStackClassName,
} from "./classes";

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
  className?: string;
};

/**
 * Low-level signed-out **frame** (platform canvas, collapsed brand rail, centered body slot).
 *
 * **Standard login routes:** use {@link AppLoginScreen} — it already includes this + {@link AppLoginPage}.
 * Do not copy this layout into app repos.
 *
 * **Allowed use:** atypical auth surfaces (e.g. MFA verify) that need the rail/frame but not the
 * full login card — still prefer shared primitives over bespoke cards.
 *
 * @see ./LOGIN_ARCHITECTURE.md
 */
export function AppLoginFramedShell({
  children,
  brandHref = "/",
  brandTitle = "Visualify",
  brandAriaLabel,
  brandMarkSrc,
  className,
}: AppLoginFramedShellProps) {
  const railLabel = brandAriaLabel ?? brandTitle;

  return (
    <AppShellOuterCanvas className={className}>
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
