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

export const APP_LOGIN_WARM_MAX_MS = 15_000;

export const APP_LOGIN_DESTINATION_MAX_WAIT_MS = 10_000;

export const APP_LOGIN_DESTINATION_POLL_MS = 50;

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
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Prefetch the destination route while the login form stays visible. */
export async function warmPostLoginRoute(href: string, router: LoginNavigationRouter): Promise<void> {
  try {
    router.prefetch?.(href);
  } catch {
    /* prefetch is best-effort */
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), APP_LOGIN_WARM_MAX_MS);

  try {
    const response = await fetch(href, {
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        RSC: "1",
        "Next-Router-Prefetch": "1",
      },
    });

    if (response.ok) {
      await response.text();
    }
  } catch {
    /* Warm is best-effort — navigation still proceeds after the cap. */
  } finally {
    window.clearTimeout(timeoutId);
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

type LoginNavigationRouter = {
  push: (href: string) => void;
  refresh: () => void;
  prefetch?: (href: string) => void;
};

/**
 * Keep login visible (Signing in…) while the destination warms, fade out, navigate,
 * then {@link AppShellPostLoginRevealEffect} reveals the app once the shell has painted.
 */
export async function navigateAfterAppLoginSuccess(
  router: LoginNavigationRouter,
  href: string,
): Promise<void> {
  await warmPostLoginRoute(href, router);

  markAppLoginPostAuthEnter();

  if (!prefersReducedLoginMotion()) {
    beginAppLoginExit();
    await wait(APP_LOGIN_EXIT_MS);
  }

  router.push(href);
  router.refresh();
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
