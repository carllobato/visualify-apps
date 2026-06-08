/** App canvas under the splash — matches `--ds-canvas` / PWA `theme_color`. */
export const VISUALIFY_APP_LAUNCH_CANVAS = "#f7f9fc";

/** Splash face — pure white until the wordmark and app morph in (desktop). */
export const VISUALIFY_APP_LAUNCH_SPLASH_BG = "#ffffff";

/** Splash face on mobile — black screen with white wordmark. */
export const VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE = "#000000";

/** Matches app-shell mobile breakpoint (`app-shell-frame.css`). */
export const VISUALIFY_APP_LAUNCH_MOBILE_MEDIA = "(max-width: 767px)";

/** Matches desktop — inverse of {@link VISUALIFY_APP_LAUNCH_MOBILE_MEDIA}. */
export const VISUALIFY_APP_LAUNCH_DESKTOP_MEDIA = "(min-width: 768px)";

/** PWA install splash — black on mobile so iOS/Android hand off without a white flash. */
export const VISUALIFY_APP_LAUNCH_MANIFEST_BACKGROUND = VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE;

export const VISUALIFY_APP_LAUNCH_SPLASH_ID = "vf-app-launch-splash";

export const VISUALIFY_APP_LAUNCH_WORDMARK_CLASS = "vf-app-launch-splash__wordmark";

export const VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS = "vf-app-launch-splash__wordmark--light";

export const VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS = "vf-app-launch-splash__wordmark--dark";

/** Wordmark intro delay before fade/slide begins (0 — canvas is already painted). */
export const VISUALIFY_APP_LAUNCH_INTRO_DELAY_MS = 0;

/** Wordmark fade/slide duration (sync with CSS). */
export const VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS = 1100;

/** Total intro time — delay + duration (sync with dismiss script fallback). */
export const VISUALIFY_APP_LAUNCH_INTRO_MS =
  VISUALIFY_APP_LAUNCH_INTRO_DELAY_MS + VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS;

/** Hold full logo before morphing into the app. */
export const VISUALIFY_APP_LAUNCH_HOLD_MS = 1500;

/** Exit morph duration — matches {@link VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS}. */
export const VISUALIFY_APP_LAUNCH_EXIT_MS = VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS;

/** App content fade/slide-in — locked to splash exit for a crossfade handoff. */
export const VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_MS = VISUALIFY_APP_LAUNCH_EXIT_MS;

/** Start content reveal with splash exit (no stagger — crossfade through the overlay). */
export const VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_DELAY_MS = 0;

export const VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS = "vf-app-launch-active";

export const VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS = "vf-app-launch-revealing";

export const VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS = "vf-app-launch-complete";

export const VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS = "vf-app-launch-app-root";

/**
 * Tiny first-paint block — keep in `<head>` before any other stylesheets so home-screen
 * launches never show the browser default white canvas between the OS splash and our overlay.
 */
export const visualifyAppLaunchFirstPaintCss = `
html,
body {
  background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE};
}

@media ${VISUALIFY_APP_LAUNCH_DESKTOP_MEDIA} {
  html,
  body {
    background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
  }
}
`.trim();

/** Inlined in `<head>` — must not depend on Tailwind or design-system CSS bundles. */
export const visualifyAppLaunchCriticalCss = `
html,
body {
  margin: 0;
  padding: 0;
  background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE};
  color: #111111;
}

@media ${VISUALIFY_APP_LAUNCH_DESKTOP_MEDIA} {
  html,
  body {
    background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
  }
}

html.${VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS},
html.${VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS} body {
  background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE};
  pointer-events: none;
  will-change: opacity, background-color;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} .vf-app-launch-splash__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} {
  width: auto;
  max-width: min(72vw, 15rem);
  height: 3rem;
  object-fit: contain;
  opacity: 0;
  transform: translateY(0.625rem) scale(0.985);
  animation: vf-app-launch-wordmark-in ${VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${VISUALIFY_APP_LAUNCH_INTRO_DELAY_MS}ms forwards;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS} {
  display: none;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS} {
  display: block;
}

@keyframes vf-app-launch-wordmark-in {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit {
  animation: vf-app-launch-splash-out-mobile ${VISUALIFY_APP_LAUNCH_EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit .${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} {
  animation: vf-app-launch-wordmark-out ${VISUALIFY_APP_LAUNCH_EXIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes vf-app-launch-splash-out {
  0% {
    opacity: 1;
    background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG};
  }
  100% {
    opacity: 0;
    background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
  }
}

@keyframes vf-app-launch-splash-out-mobile {
  0% {
    opacity: 1;
    background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE};
  }
  100% {
    opacity: 0;
    background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
  }
}

@media ${VISUALIFY_APP_LAUNCH_DESKTOP_MEDIA} {
  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} {
    background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG};
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS} {
    display: block;
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS} {
    display: none;
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit {
    animation-name: vf-app-launch-splash-out;
  }
}

@keyframes vf-app-launch-wordmark-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-0.375rem) scale(1.035);
    filter: blur(1px);
  }
}

.${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  min-height: 100dvh;
}

/* Pre-complete only — transform/filter/will-change break position:fixed descendants (e.g. mobile bottom nav). */
html:not(.${VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS}) .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  opacity: 0;
  transform: translateY(0.75rem);
  filter: blur(5px);
  will-change: opacity, transform, filter;
}

html.${VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS},
html.${VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS} body {
  background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
}

html.${VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  animation: vf-app-launch-content-in ${VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)
    ${VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_DELAY_MS}ms forwards;
}

html.${VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  opacity: 1;
  transform: none;
  filter: none;
  will-change: auto;
}

@keyframes vf-app-launch-content-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
    filter: blur(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} {
    animation: none;
    opacity: 1;
    transform: none;
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit,
  #${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit .${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} {
    animation-duration: 0.01ms;
  }

  html:not(.${VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS}) .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
    opacity: 1;
    transform: none;
    filter: none;
    will-change: auto;
  }

  html.${VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
    animation: none;
  }
}
`.trim();
