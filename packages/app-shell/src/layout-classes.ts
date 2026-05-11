/**
 * Class-name building blocks for the HQ-style outer canvas + framed document column.
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

/** Primary page content slot when the scroll region renders a footer row (signed-in HQ). */
export const appShellScrollMainSlotClassName = "vf-app-shell-scroll-main-slot";

/** Footer slot wrapper below main content (signed-in HQ pattern). */
export const appShellScrollFooterSlotClassName = "vf-app-shell-scroll-footer-slot";

/** Centered full-area content (signed-out HQ / login pattern). */
export const appShellScrollInnerCenteredClassName = "vf-app-shell-scroll-inner-centered";
