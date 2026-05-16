/**
 * Class-name building blocks for the outer canvas + framed document column.
 * Styles live in `app-shell-frame.css` so frame shadow/radius work when Tailwind content paths
 * do not scan this package.
 */

/** Full-viewport row: muted canvas behind the shell (sibling to rail/aside). */
export const appShellOuterCanvasClassName = "vf-app-shell-outer-canvas";

/** Right-hand column beside a fixed-width rail. */
export const appShellMainColumnClassName = "vf-app-shell-main-column";

/** Outer padding around the elevated document frame. */
export const appShellFrameGutterClassName = "vf-app-shell-frame-gutter";

/** Rounded elevated surface (shadow) wrapping the scroll region. */
export const appShellFramedSurfaceClassName = "vf-app-shell-framed-surface";

/** Scrollable document area inside the frame. */
export const appShellScrollRegionClassName = "vf-app-shell-scroll-region";

/** Primary page content slot when the scroll region renders a footer row. */
export const appShellScrollMainSlotClassName = "vf-app-shell-scroll-main-slot";

/** Footer slot wrapper below main content (sticky footer-at-bottom-of-scroll-pane pattern). */
export const appShellScrollFooterSlotClassName = "vf-app-shell-scroll-footer-slot";

/** Centered full-area content (signed-out / marketing-style scroll body). */
export const appShellScrollInnerCenteredClassName = "vf-app-shell-scroll-inner-centered";

/** Outer slot for a rail footer control (account menu, sign-out, etc.). */
export const appShellRailFooterAccountOuterClassName = "vf-app-shell-rail-footer-account-outer";

/** Inner 40px row inside {@link appShellRailFooterAccountOuterClassName}. */
export const appShellRailFooterAccountStripClassName = "vf-app-shell-rail-footer-account-strip";
