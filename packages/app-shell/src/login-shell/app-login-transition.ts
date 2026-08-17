/** `html` class while the signed-out login shell fades out before route change. */
export const APP_LOGIN_EXIT_HTML_CLASS = "vf-app-login-exiting";

/** `html` class while the signed-in shell is loaded but not yet revealed. */
export const APP_LOGIN_POST_AUTH_HOLD_HTML_CLASS = "vf-app-login-post-auth-hold";

/** `html` class while the signed-in app shell fades in after auth. */
export const APP_LOGIN_POST_AUTH_ENTER_HTML_CLASS = "vf-app-login-post-auth-enter";

/** `html` class after post-auth enter — clears transform/will-change. */
export const APP_LOGIN_POST_AUTH_ENTER_COMPLETE_HTML_CLASS = "vf-app-login-post-auth-enter-complete";

export const APP_LOGIN_EXIT_MS = 480;

export const APP_LOGIN_ENTER_MS = 720;

export const APP_LOGIN_ENTER_DELAY_MS = 60;

/** @deprecated Warming via RSC fetch raced cookies and could cache a login redirect. */
export const APP_LOGIN_WARM_MAX_MS = 15_000;

export const APP_LOGIN_DESTINATION_MAX_WAIT_MS = 10_000;

export const APP_LOGIN_DESTINATION_POLL_MS = 50;

export const APP_LOGIN_PAINT_TIMEOUT_MS = 250;

export const APP_LOGIN_LAUNCH_MAX_WAIT_MS = 8_000;

/** Yield so `@supabase/ssr` can flush auth cookies before `location.assign`. */
export const APP_LOGIN_COOKIE_YIELD_MS = 80;

const APP_LOGIN_POST_AUTH_SESSION_KEY = "vf-app-login-post-auth-enter";

/** @deprecated Stuck-state cleanup only — from the full-screen overlay experiment. */
const APP_LOGIN_TRANSITION_PENDING_SESSION_KEY = "vf-app-login-transition-pending";

export function markAppLoginPostAuthEnter(): void {
  try {
    sessionStorage.setItem(APP_LOGIN_POST_AUTH_SESSION_KEY, "1");
  } catch {
    /* private browsing / disabled storage */
  }
}

export function hasAppLoginPostAuthEnter(): boolean {
  try {
    return sessionStorage.getItem(APP_LOGIN_POST_AUTH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeAppLoginPostAuthEnter(): boolean {
  if (!hasAppLoginPostAuthEnter()) {
    return false;
  }

  try {
    sessionStorage.removeItem(APP_LOGIN_POST_AUTH_SESSION_KEY);
  } catch {
    /* ignore */
  }

  return true;
}

export function beginAppLoginExit(): void {
  document.documentElement.classList.add(APP_LOGIN_EXIT_HTML_CLASS);
}

export function endAppLoginExit(): void {
  document.documentElement.classList.remove(APP_LOGIN_EXIT_HTML_CLASS);
}

function prefersReducedLoginMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForNextPaint(): Promise<void> {
  return Promise.race([
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    }),
    wait(APP_LOGIN_PAINT_TIMEOUT_MS),
  ]);
}

/**
 * True when the launch splash is still covering the app. Used so post-auth reveal
 * does not fade the shell in underneath an active splash.
 * Class names must match `VISUALIFY_APP_LAUNCH_*_HTML_CLASS` in app-launch-splash.ts.
 */
export function isLaunchSplashBlockingReveal(classList: {
  contains: (token: string) => boolean;
}): boolean {
  return classList.contains("vf-app-launch-active") && !classList.contains("vf-app-launch-complete");
}

type LoginNavigationRouter = {
  push: (href: string) => void;
  refresh: () => void;
  prefetch?: (href: string) => void;
};

/** Prefetch is unused after hard navigation; kept so existing imports compile. */
export async function warmPostLoginRoute(_href: string, router: LoginNavigationRouter): Promise<void> {
  try {
    router.prefetch?.(_href);
  } catch {
    /* prefetch is best-effort */
  }
}

/** Wait until the signed-in app shell is in the DOM and has painted. */
export async function waitForPostLoginDestinationShell(
  maxWaitMs = APP_LOGIN_DESTINATION_MAX_WAIT_MS,
): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const shell = document.querySelector(
      ".vf-app-shell-outer-canvas:not(.vf-app-login-framed-shell)",
    );
    const mainColumn = shell?.querySelector(".vf-app-shell-main-column");

    if (shell && mainColumn) {
      await waitForNextPaint();
      await waitForNextPaint();
      return true;
    }

    await wait(APP_LOGIN_DESTINATION_POLL_MS);
  }

  return false;
}

/** Wait until splash is gone so the post-auth fade-in is visible. */
export async function waitForPostLoginLaunchComplete(
  maxWaitMs = APP_LOGIN_LAUNCH_MAX_WAIT_MS,
): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    if (!isLaunchSplashBlockingReveal(document.documentElement.classList)) {
      return true;
    }
    await wait(APP_LOGIN_DESTINATION_POLL_MS);
  }

  return !isLaunchSplashBlockingReveal(document.documentElement.classList);
}

/**
 * Fade the login shell out, then load the destination as a full document so auth
 * cookies from `signInWithPassword` are on the request. Client `router.push` plus
 * an RSC prefetch raced cookie writes and could cache the unauthenticated redirect.
 */
export async function navigateAfterAppLoginSuccess(
  _router: LoginNavigationRouter,
  href: string,
): Promise<void> {
  markAppLoginPostAuthEnter();
  await wait(0);
  await wait(APP_LOGIN_COOKIE_YIELD_MS);

  if (!prefersReducedLoginMotion()) {
    beginAppLoginExit();
    await wait(APP_LOGIN_EXIT_MS);
  }

  window.location.assign(href);
}

/** Clears stuck overlay state from older builds — does not affect active post-auth fades. */
export function clearLegacyAppLoginTransitionState(): void {
  try {
    sessionStorage.removeItem(APP_LOGIN_TRANSITION_PENDING_SESSION_KEY);
  } catch {
    /* ignore */
  }

  document.documentElement.classList.remove("vf-app-login-transition-pending");
}
