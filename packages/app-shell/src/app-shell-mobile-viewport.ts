/** Set on `<html>` when the app runs as an iOS home-screen PWA (`navigator.standalone`). */
export const APP_SHELL_IOS_STANDALONE_HTML_CLASS = "vf-app-shell-ios-standalone";

const MOBILE_SHELL_MEDIA = "(max-width: 767px)";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

/** iOS home-screen PWAs — CSS `(display-mode: standalone)` is unreliable on Safari. */
export function isIosStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as NavigatorWithStandalone).standalone === true;
}

export function isMobileShellViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_SHELL_MEDIA).matches;
}

/** Toggle the standalone class used by mobile shell height overrides in `app-shell-frame.css`. */
export function syncAppShellIosStandaloneClass(): void {
  const root = document.documentElement;
  const active =
    isMobileShellViewport() &&
    (isIosStandalonePwa() || window.matchMedia("(display-mode: standalone)").matches);

  root.classList.toggle(APP_SHELL_IOS_STANDALONE_HTML_CLASS, active);
}

export function bindAppShellIosStandaloneClass(): () => void {
  syncAppShellIosStandaloneClass();

  const mobileQuery = window.matchMedia(MOBILE_SHELL_MEDIA);
  const onChange = () => syncAppShellIosStandaloneClass();

  window.addEventListener("orientationchange", onChange);
  mobileQuery.addEventListener("change", onChange);

  return () => {
    window.removeEventListener("orientationchange", onChange);
    mobileQuery.removeEventListener("change", onChange);
    document.documentElement.classList.remove(APP_SHELL_IOS_STANDALONE_HTML_CLASS);
  };
}
