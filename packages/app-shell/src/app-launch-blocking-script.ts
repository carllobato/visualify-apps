import { VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS } from "./app-launch-splash";

/** Runs before paint — marks launch active so first-paint CSS stays on the splash canvas. */
export const visualifyAppLaunchBlockingScript = `(function(){try{document.documentElement.classList.add("${VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS}");}catch(e){}})();`;
