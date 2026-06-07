"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { VISUALIFY_LOGO_DARK_SRC, VISUALIFY_LOGO_LIGHT_SRC } from "./visualify-brand";
import {
  VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS,
  VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS,
  VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_DELAY_MS,
  VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_MS,
  VISUALIFY_APP_LAUNCH_EXIT_MS,
  VISUALIFY_APP_LAUNCH_HOLD_MS,
  VISUALIFY_APP_LAUNCH_INTRO_MS,
  VISUALIFY_APP_LAUNCH_MOBILE_MEDIA,
  VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS,
  VISUALIFY_APP_LAUNCH_SPLASH_ID,
  VISUALIFY_APP_LAUNCH_WORDMARK_CLASS,
  VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS,
  VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS,
} from "./app-launch-splash";

type SplashPhase = "visible" | "exiting" | "hidden";

/** Splash overlay + app root — dismisses via React state (never `Node.remove()`). */
export function VisualifyAppLaunchController({ children }: { children: ReactNode }) {
  const [splashPhase, setSplashPhase] = useState<SplashPhase>("visible");
  const lightWordmarkRef = useRef<HTMLImageElement>(null);
  const darkWordmarkRef = useRef<HTMLImageElement>(null);
  const exitStartedRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let introDone = reducedMotion;
    let appReady = document.readyState === "complete";
    let holdTimer: number | null = null;
    const timers: number[] = [];

    function scheduleExit() {
      if (exitStartedRef.current || holdTimer !== null) return;
      if (!introDone || !appReady) return;
      holdTimer = window.setTimeout(startExit, reducedMotion ? 0 : VISUALIFY_APP_LAUNCH_HOLD_MS);
      timers.push(holdTimer);
    }

    function startExit() {
      if (exitStartedRef.current) return;
      exitStartedRef.current = true;

      if (!reducedMotion) {
        root.classList.add(VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS);
        timers.push(
          window.setTimeout(() => {
            root.classList.remove(VISUALIFY_APP_LAUNCH_REVEALING_HTML_CLASS);
            root.classList.add(VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS);
          }, VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_MS + VISUALIFY_APP_LAUNCH_CONTENT_REVEAL_DELAY_MS + 60),
        );
      } else {
        root.classList.add(VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS);
      }

      setSplashPhase("exiting");
      timers.push(
        window.setTimeout(() => {
          setSplashPhase("hidden");
        }, VISUALIFY_APP_LAUNCH_EXIT_MS + 40),
      );
    }

    function markIntroDone() {
      introDone = true;
      scheduleExit();
    }

    function markAppReady() {
      appReady = true;
      scheduleExit();
    }

    if (reducedMotion) {
      markIntroDone();
    } else {
      const isMobile = window.matchMedia(VISUALIFY_APP_LAUNCH_MOBILE_MEDIA).matches;
      const wordmark = (isMobile ? darkWordmarkRef : lightWordmarkRef).current;
      if (wordmark) {
        wordmark.addEventListener(
          "animationend",
          (event) => {
            if (event.animationName === "vf-app-launch-wordmark-in") {
              markIntroDone();
            }
          },
          { once: true },
        );
      }
      const navStart = performance.timeOrigin || Date.now();
      const introRemaining = Math.max(0, VISUALIFY_APP_LAUNCH_INTRO_MS + 140 - (Date.now() - navStart));
      timers.push(window.setTimeout(markIntroDone, introRemaining + 40));
    }

    if (appReady) {
      markAppReady();
    } else {
      window.addEventListener("load", markAppReady, { once: true });
    }

    timers.push(
      window.setTimeout(() => {
        markIntroDone();
        markAppReady();
      }, 8000),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return (
    <>
      {splashPhase !== "hidden" ? (
        <div
          id={VISUALIFY_APP_LAUNCH_SPLASH_ID}
          className={splashPhase === "exiting" ? "vf-app-launch-splash--exit" : undefined}
          aria-hidden="true"
        >
          <div className="vf-app-launch-splash__stage">
            <img
              ref={lightWordmarkRef}
              className={`${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} ${VISUALIFY_APP_LAUNCH_WORDMARK_LIGHT_CLASS}`}
              src={VISUALIFY_LOGO_LIGHT_SRC}
              alt=""
              width={240}
              height={48}
              decoding="sync"
              fetchPriority="high"
            />
            <img
              ref={darkWordmarkRef}
              className={`${VISUALIFY_APP_LAUNCH_WORDMARK_CLASS} ${VISUALIFY_APP_LAUNCH_WORDMARK_DARK_CLASS}`}
              src={VISUALIFY_LOGO_DARK_SRC}
              alt=""
              width={240}
              height={48}
              decoding="sync"
              fetchPriority="high"
            />
          </div>
        </div>
      ) : null}
      <div className={VISUALIFY_APP_LAUNCH_APP_ROOT_CLASS}>{children}</div>
    </>
  );
}
