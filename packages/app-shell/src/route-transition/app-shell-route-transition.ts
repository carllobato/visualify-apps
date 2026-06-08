/** `html` class while route content is hidden between fade-out and fade-in. */
export const APP_SHELL_ROUTE_HOLD_HTML_CLASS = "vf-app-shell-route-hold";

export const APP_SHELL_ROUTE_FADE_MS = 280;

const APP_SHELL_ROUTE_ENTER_SESSION_KEY = "vf-app-shell-route-enter";

export type AppShellRouteNavigationRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  prefetch?: (href: string) => void;
};

export function markAppShellRouteEnterPending(): void {
  try {
    sessionStorage.setItem(APP_SHELL_ROUTE_ENTER_SESSION_KEY, "1");
  } catch {
    /* private browsing / disabled storage */
  }
}

export function consumeAppShellRouteEnterPending(): boolean {
  try {
    if (sessionStorage.getItem(APP_SHELL_ROUTE_ENTER_SESSION_KEY) !== "1") {
      return false;
    }
    sessionStorage.removeItem(APP_SHELL_ROUTE_ENTER_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

function prefersReducedRouteMotion(): boolean {
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

function pageTransitionElement(): HTMLElement | null {
  const el = document.querySelector(".vf-app-shell-page-transition");
  return el instanceof HTMLElement ? el : null;
}

function forcePageTransitionReflow(): void {
  void pageTransitionElement()?.offsetHeight;
}

function waitForPageTransitionOpacityEnd(): Promise<void> {
  const el = pageTransitionElement();

  if (!el) {
    return wait(APP_SHELL_ROUTE_FADE_MS);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("transitionend", onTransitionEnd);
      resolve();
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === el && event.propertyName === "opacity") {
        finish();
      }
    };

    el.addEventListener("transitionend", onTransitionEnd);
    window.setTimeout(finish, APP_SHELL_ROUTE_FADE_MS + 80);
  });
}

export function beginAppShellRouteTransitionHold(): void {
  if (prefersReducedRouteMotion()) {
    return;
  }

  const root = document.documentElement;

  if (root.classList.contains(APP_SHELL_ROUTE_HOLD_HTML_CLASS)) {
    return;
  }

  root.classList.add(APP_SHELL_ROUTE_HOLD_HTML_CLASS);
  forcePageTransitionReflow();
}

/** Fade out, navigate, then {@link AppShellRouteTransitionEffect} fades the destination in. */
export async function navigateAfterAppShellRouteTransition(
  router: AppShellRouteNavigationRouter,
  href: string,
  options?: { replace?: boolean },
): Promise<void> {
  try {
    router.prefetch?.(href);
  } catch {
    /* prefetch is best-effort */
  }

  beginAppShellRouteTransitionHold();
  markAppShellRouteEnterPending();

  if (options?.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}

export async function revealAppShellRouteDestination(): Promise<void> {
  await waitForNextPaint();
  await waitForNextPaint();

  const root = document.documentElement;
  root.classList.remove(APP_SHELL_ROUTE_HOLD_HTML_CLASS);
  forcePageTransitionReflow();

  if (prefersReducedRouteMotion()) {
    return;
  }

  await waitForPageTransitionOpacityEnd();
}

export function clearAppShellRouteTransitionState(): void {
  document.documentElement.classList.remove(APP_SHELL_ROUTE_HOLD_HTML_CLASS);
}
