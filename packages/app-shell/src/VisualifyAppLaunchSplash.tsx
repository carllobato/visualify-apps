import type { ReactNode } from "react";
import { VISUALIFY_LOGO_LIGHT_SRC } from "./visualify-brand";
import { visualifyAppLaunchCriticalCss } from "./app-launch-splash";

export { VisualifyAppLaunchController } from "./VisualifyAppLaunchController";

/**
 * Instant launch paint for home-screen / standalone PWAs.
 * White screen → black wordmark intro → morph into the app once loaded.
 */
export function VisualifyAppLaunchCriticalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: visualifyAppLaunchCriticalCss }} />;
}

export function VisualifyAppLaunchBrandMarkPreload() {
  return <link rel="preload" as="image" href={VISUALIFY_LOGO_LIGHT_SRC} />;
}

/** @deprecated Wrap the app in {@link VisualifyAppLaunchController} instead. */
export function VisualifyAppLaunchAppRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
