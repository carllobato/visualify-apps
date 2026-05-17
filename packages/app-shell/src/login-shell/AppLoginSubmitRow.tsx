"use client";

import { Button } from "@visualify/design-system";
import { appLoginSubmitButtonClassName, appLoginSubmitRowClassName } from "./classes";

export type AppLoginSubmitRowProps = {
  pending?: boolean;
  /** Primary action label when idle. */
  label?: string;
  /** Label while `pending` is true. */
  pendingLabel?: string;
};

const SIGN_IN_LABEL = "Sign in";
const SIGN_IN_PENDING_LABEL = "Signing in…";
const SIGN_UP_LABEL = "Sign up";
const SIGN_UP_PENDING_LABEL = "Signing up…";

/**
 * Centered primary submit control for login forms (HQ and product apps).
 * For server actions, read `pending` from `useFormStatus()` in a thin wrapper and pass it here.
 */
export function AppLoginSubmitRow({
  pending = false,
  label = SIGN_IN_LABEL,
  pendingLabel = SIGN_IN_PENDING_LABEL,
}: AppLoginSubmitRowProps) {
  return (
    <div className={appLoginSubmitRowClassName}>
      <Button
        type="submit"
        variant="primary"
        disabled={pending}
        className={appLoginSubmitButtonClassName}
      >
        {pending ? pendingLabel : label}
      </Button>
    </div>
  );
}

export function appLoginSubmitLabelsForMode(mode: "signin" | "signup"): {
  label: string;
  pendingLabel: string;
} {
  return mode === "signup"
    ? { label: SIGN_UP_LABEL, pendingLabel: SIGN_UP_PENDING_LABEL }
    : { label: SIGN_IN_LABEL, pendingLabel: SIGN_IN_PENDING_LABEL };
}
