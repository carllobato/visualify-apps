/** App canvas under the splash — matches `--ds-canvas` / PWA `theme_color`. */
export const VISUALIFY_APP_LAUNCH_CANVAS = "#f7f9fc";

/** Splash face — pure white until the wordmark and app morph in (desktop). */
export const VISUALIFY_APP_LAUNCH_SPLASH_BG = "#ffffff";

/** Splash face on mobile — black screen with white wordmark. */
export const VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE = "#000000";

/** Matches app-shell mobile breakpoint (`app-shell-frame.css`). */
export const VISUALIFY_APP_LAUNCH_MOBILE_MEDIA = "(max-width: 767px)";

export const VISUALIFY_APP_LAUNCH_SPLASH_ID = "vf-app-launch-splash";

export const VISUALIFY_APP_LAUNCH_WORDMARK_CLASS = "vf-app-launch-splash__wordmark";

export const VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS = "vf-app-launch-splash__wordmark--light";

export const VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS = "vf-app-launch-splash__wordmark--dark";

/** Wordmark intro delay before fade/slide begins. */
export const VISUALIFY_APP_LAUNCH_INTRO_DELAY_MS = 320;

/** Wordmark fade/slide duration (sync with CSS). */
export const VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS = 1100;

/** Total intro time — delay + duration (sync with dismiss script fallback). */
export const VISUALIFY_APP_LAUNCH_INTRO_MS =
  VISUALIFY_APP_LAUNCH_INTRO_DELAY_MS + VISUALIFY_APP_LAUNCH_INTRO_DURATION_MS;

/** Hold full logo on white before morphing into the app. */
export const VISUALIFY_APP_LAUNCH_HOLD_MS = 950;

/** Exit morph duration (sync with CSS). */
export const VISUALIFY_APP_LAUNCH_EXIT_MS = 520;

/** App content fade/slide-in — overlaps splash exit for a smooth handoff. */
export const VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_MS = 720;

/** Delay before app content begins revealing during splash exit. */
export const VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_DELAY_MS = 100;

export const VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS = "vf-app-launch-active";

export const VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS = "vf-app-launch-revealing";

export const VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS = "vf-app-launch-complete";

export const VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS = "vf-app-launch-app-root";

/** Inlined in `<head>` — must not depend on Tailwind or design-system CSS bundles. */
export const visualifyAppLaunchCriticalCss = `
html,
body {
  margin: 0;
  padding: 0;
  background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
  color: #111111;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG};
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
  display: block;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS} {
  display: none;
}

@keyframes vf-app-launch-wordmark-in {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit {
  animation: vf-app-launch-splash-out ${VISUALIFY_APP_LAUNCH_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

#${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit .${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} {
  animation: vf-app-launch-wordmark-out ${VISUALIFY_APP_LAUNCH_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes vf-app-launch-splash-out {
  0% {
    opacity: 1;
    background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG};
  }
  55% {
    opacity: 1;
    background-color: color-mix(in srgb, ${VISUALIFY_APP_LAUNCH_SPLASH_BG} 35%, ${VISUALIFY_APP_LAUNCH_CANVAS} 65%);
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
  55% {
    opacity: 1;
    background-color: color-mix(in srgb, ${VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE} 35%, ${VISUALIFY_APP_LAUNCH_CANVAS} 65%);
  }
  100% {
    opacity: 0;
    background-color: ${VISUALIFY_APP_LAUNCH_CANVAS};
  }
}

@media ${VISUALIFY_APP_LAUNCH_MOBILE_MEDIA} {
  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} {
    background-color: ${VISUALIFY_APP_LAUNCH_SPLASH_BG_MOBILE};
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS} {
    display: none;
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID} .${VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS} {
    display: block;
  }

  #${VISUALIFY_APP_LAUNCH_SPLASH_ID}.vf-app-launch-splash--exit {
    animation-name: vf-app-launch-splash-out-mobile;
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

html.${VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS},
.${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  opacity: 0;
  transform: translateY(0.75rem);
  filter: blur(5px);
  will-change: opacity, transform, filter;
  min-height: 100dvh;
}

html.${VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  animation: vf-app-launch-content-in ${VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)
    ${VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_DELAY_MS}ms forwards;
}

html.${VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
  opacity: 1;
  transform: none;
  filter: none;
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

  html.${VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS},
  .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
    opacity: 1;
    transform: none;
    filter: none;
  }

  html.${VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS} .${VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS} {
    animation: none;
  }
}
`.trim();
