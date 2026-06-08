"use client";

import { useLayoutEffect } from "react";
import {
  APP_LOGIN_ENTER_DELAY_MS,
  APP_LOGIN_ENTER_MS,
  APP_LOGIN_POST_AUTH_ENTER_COMPLETE_HTML_CLASS,
  APP_LOGIN_POST_AUTH_ENTER_HTML_CLASS,
  APP_LOGIN_POST_AUTH_HOLD_HTML_CLASS,
  consumeAppLoginPostAuthEnter,
  endAppLoginExit,
  hasAppLoginPostAuthEnter,
  waitForPostLoginDestinationShell,
} from "./app-login-transition";

/** Mount in the signed-in shell — holds the app hidden until ready, then fades it in. */
export function AppShellPostLoginRevealEffect() {
  useLayoutEffect(() => {
    endAppLoginExit();

    if (!hasAppLoginPostAuthEnter()) {
      return;
    }

    const root = document.documentElement;
    root.classList.add(APP_LOGIN_POST_AUTH_HOLD_HTML_CLASS);

    let enterTimer: number | null = null;
    let cancelled = false;

    void (async () => {
      await waitForPostLoginDestinationShell();

      if (cancelled || !consumeAppLoginPostAuthEnter()) {
        root.classList.remove(APP_LOGIN_POST_AUTH_HOLD_HTML_CLASS);
        return;
      }

      root.classList.remove(APP_LOGIN_POST_AUTH_HOLD_HTML_CLASS);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        return;
      }

      root.classList.add(APP_LOGIN_POST_AUTH_ENTER_HTML_CLASS);

      enterTimer = window.setTimeout(() => {
        root.classList.remove(APP_LOGIN_POST_AUTH_ENTER_HTML_CLASS);
        root.classList.add(APP_LOGIN_POST_AUTH_ENTER_COMPLETE_HTML_CLASS);
      }, APP_LOGIN_ENTER_MS + APP_LOGIN_ENTER_DELAY_MS + 40);
    })();

    return () => {
      cancelled = true;
      if (enterTimer !== null) {
        window.clearTimeout(enterTimer);
      }
      root.classList.remove(
        APP_LOGIN_POST_AUTH_HOLD_HTML_CLASS,
        APP_LOGIN_POST_AUTH_ENTER_HTML_CLASS,
        APP_LOGIN_POST_AUTH_ENTER_COMPLETE_HTML_CLASS,
      );
    };
  }, []);

  return null;
}
