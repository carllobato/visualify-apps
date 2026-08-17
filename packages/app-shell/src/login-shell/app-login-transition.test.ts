import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS,
  VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS,
} from "../app-launch-splash.ts";
import { isLaunchSplashBlockingReveal } from "./app-login-transition.ts";

function classListOf(...tokens: string[]) {
  const set = new Set(tokens);
  return { contains: (token: string) => set.has(token) };
}

describe("isLaunchSplashBlockingReveal", () => {
  it("blocks reveal while the launch splash is active and not complete", () => {
    assert.equal(
      isLaunchSplashBlockingReveal(classListOf(VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS)),
      true
    );
  });

  it("allows reveal after the splash completes", () => {
    assert.equal(
      isLaunchSplashBlockingReveal(
        classListOf(
          VISUALIFY_APP_LAUNCH_ACTIVE_HTML_CLASS,
          VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS
        )
      ),
      false
    );
    assert.equal(
      isLaunchSplashBlockingReveal(classListOf(VISUALIFY_APP_LAUNCH_COMPLETE_HTML_CLASS)),
      false
    );
  });

  it("allows reveal when no splash is in play", () => {
    assert.equal(isLaunchSplashBlockingReveal(classListOf()), false);
  });
});
