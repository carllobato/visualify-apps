import type { ReactNode } from "react";
import { VISUALIFY_LOGO_DARK_SRC, VISUALIFY_LOGO_LIGHT_SRC } from "./visualify-brand";
import {
  appShellIosStandaloneBlockingScript,
  visualifyAppLaunchBlockingScript,
} from "./app-launch-blocking-script";
import {
  VISUALIFY_APP_LAUNCH_MOBILE_MEDIA,
  visualifyAppLaunchCriticalCss,
  visualifyAppLaunchFirstPaintCss,
} from "./app-launch-splash";

export { VisualifyAppLaunchController } from "./VisualifyAppLaunchController";

/**
 * Instant launch paint for home-screen / standalone PWAs.
 * Desktop: white screen + black wordmark. Mobile: black screen + white wordmark.
 */
export function VisualifyAppLaunchCriticalStyles() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: visualifyAppLaunchBlockingScript }} />
      <script dangerouslySetInnerHTML={{ __html: appShellIosStandaloneBlockingScript }} />
      <style dangerouslySetInnerHTML={{ __html: visualifyAppLaunchFirstPaintCss }} />
      <style dangerouslySetInnerHTML={{ __html: visualifyAppLaunchCriticalCss }} />
    </>
  );
}

export function VisualifyAppLaunchBrandMarkPreload() {
  return (
    <>
      <link rel="preload" as="image" href={VISUALIFY_LOGO_LIGHT_SRC} media="(min-width: 768px)" />
      <link rel="preload" as="image" href={VISUALIFY_LOGO_DARK_SRC} media={VISUALIFY_APP_LAUNCH_MOBILE_MEDIA} />
    </>
  );
}

/** @deprecated Wrap the app in {@link VisualifyAppLaunchController} instead. */
export function VisualifyAppLaunchAppRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
