"use client";

import { Button, Callout } from "@visualify/design-system";

export type AppLoginSignUpAwaitingEmailPanelProps = {
  email: string;
  onUseDifferentEmail: () => void;
  onBackToSignIn: () => void;
};

/** Post–sign-up “check your email” panel (shared across product login forms). */
export function AppLoginSignUpAwaitingEmailPanel({
  email,
  onUseDifferentEmail,
  onBackToSignIn,
}: AppLoginSignUpAwaitingEmailPanelProps) {
  const trimmedEmail = email.trim();

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <Callout status="success" className="text-center text-[length:var(--ds-text-sm)]">
        <p className="font-medium text-[var(--ds-text-primary)]">Check your email</p>
        <p className="mt-1.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          We sent a confirmation link to{" "}
          <span className="break-all font-medium text-[var(--ds-text-primary)]">{trimmedEmail}</span>.
          Open it to finish signing up. If you do not see it, check your spam folder.
        </p>
      </Callout>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onUseDifferentEmail}
        >
          Use a different email
        </Button>
        <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={onBackToSignIn}>
          Back to sign in
        </Button>
      </div>
    </div>
  );
}
