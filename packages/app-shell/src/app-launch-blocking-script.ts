import { VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS } from "./app-launch-splash";
import { APP_SHELL_IOS_STANDALONE_HTML_CLASS } from "./app-shell-mobile-viewport";

/** Runs before paint — marks launch active so first-paint CSS stays on the splash canvas. */
export const visualifyAppLaunchBlockingScript = `(function(){try{document.documentElement.classList.add("${VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS}");}catch(e){}})();`;

/** Runs before paint — iOS ignores `(display-mode: standalone)`; `navigator.standalone` is authoritative. */
export const appShellIosStandaloneBlockingScript = `(function(){try{var n=navigator;var m=window.matchMedia;if((n.standalone===true||m("(display-mode:standalone)").matches)&&m("(max-width:767px)").matches){document.documentElement.classList.add("${APP_SHELL_IOS_STANDALONE_HTML_CLASS}");}}catch(e){}})();`;
