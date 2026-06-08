import type { Viewport } from "next";
import {
  VISUALIFY_APP_LAUNCH_CANVAS,
  VISUALIFY_APP_LAUNCH_DESKTOP_MEDIA,
  VISUALIFY_APP_LAUNCH_MOBILE_MEDIA,
  VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE,
} from "./app-launch-splash";

/** Shared viewport for product app shells — black chrome on mobile during launch handoff. */
export const visualifyAppLaunchViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: VISUALIFY_APP_LAUNCH_MOBILE_MEDIA, color: VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE },
    { media: VISUALIFY_APP_LAUNCH_DESKTOP_MEDIA, color: VISUALIFY_APP_LAUNCH_CANVAS },
  ],
  viewportFit: "cover",
};
