"use client";

import { useEffect, useId, useState } from "react";
import { Button, Callout, Input, Label } from "@visualify/design-system";
import type { AppShellSupabaseAuthClient } from "./account-security/types";

const MIN_PASSWORD_LENGTH = 8;
const SUCCESS_RESET_MS = 4000;

const DEFAULT_NO_EMAIL_MESSAGE =
  "Password change requires an email sign-in. If you use another sign-in method, use “Forgot password” on the login page.";

type FieldKey = "current" | "new" | "confirm";

export type AppShellChangePasswordFormProps = {
  getSupabaseClient: () => AppShellSupabaseAuthClient;
  /** Prefix for input / error element ids (a11y). */
  idPrefix?: string;
  successMessage?: string;
  noEmailSignInMessage?: string;
};

export function AppShellChangePasswordForm({
  getSupabaseClient,
  idPrefix: idPrefixProp,
  successMessage = "Your password was updated.",
  noEmailSignInMessage = DEFAULT_NO_EMAIL_MESSAGE,
}: AppShellChangePasswordFormProps) {
  const reactId = useId().replace(/:/g, "");
  const idPrefix = idPrefixProp ?? `account-password-${reactId}`;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => setSuccessBanner(null), SUCCESS_RESET_MS);
    return () => clearTimeout(timer);
  }, [successBanner]);

  function runValidation(): boolean {
    const errs: Partial<Record<FieldKey, string>> = {};
    if (!currentPassword.trim()) {
      errs.current = "Current password is required.";
    }
    const next = newPassword.trim();
    if (!newPassword.trim()) {
      errs.new = "New password is required.";
    } else if (next.length < MIN_PASSWORD_LENGTH) {
      errs.new = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword.trim()) {
      errs.confirm = "Confirm new password is required.";
    } else if (next !== confirmPassword.trim()) {
      errs.confirm = "New password and confirmation do not match.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessBanner(null);
    if (!runValidation()) return;

    const supabase = getSupabaseClient();
    setSaving(true);
    try {
      const trimmedCurrent = currentPassword.trim();
      const nextPass = newPassword.trim();

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.email) {
        setFormError(userErr?.message ?? noEmailSignInMessage);
        return;
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: trimmedCurrent,
      });
      if (verifyErr) {
        const m = verifyErr.message ?? "";
        setFormError(/invalid login credentials/i.test(m) ? "Current password is incorrect." : m);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: nextPass,
      });
      if (updateErr) {
        setFormError(updateErr.message ?? "Could not update password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setSuccessBanner(successMessage);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3" noValidate>
      <PasswordField
        fieldId={`${idPrefix}-current`}
        label="Current password"
        value={currentPassword}
        onChange={(value) => {
          setCurrentPassword(value);
          if (fieldErrors.current) setFieldErrors((p) => ({ ...p, current: undefined }));
        }}
        error={fieldErrors.current}
        autoComplete="current-password"
        disabled={saving}
      />
      <PasswordField
        fieldId={`${idPrefix}-new`}
        label="New password"
        value={newPassword}
        onChange={(value) => {
          setNewPassword(value);
          if (fieldErrors.new) setFieldErrors((p) => ({ ...p, new: undefined }));
        }}
        error={fieldErrors.new}
        autoComplete="new-password"
        disabled={saving}
      />
      <PasswordField
        fieldId={`${idPrefix}-confirm`}
        label="Confirm new password"
        value={confirmPassword}
        onChange={(value) => {
          setConfirmPassword(value);
          if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }));
        }}
        error={fieldErrors.confirm}
        autoComplete="new-password"
        disabled={saving}
      />
      {formError ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {formError}
        </Callout>
      ) : null}
      {successBanner ? (
        <Callout status="success" role="status" className="text-[length:var(--ds-text-sm)]">
          {successBanner}
        </Callout>
      ) : null}
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

function PasswordField({
  fieldId,
  label,
  value,
  onChange,
  error,
  autoComplete,
  disabled,
}: {
  fieldId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
  disabled: boolean;
}) {
  const errId = `${fieldId}-err`;
  return (
    <div className="max-w-sm">
      <Label htmlFor={fieldId} className="!mb-1">
        {label}{" "}
        <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
          *
        </span>
      </Label>
      <Input
        id={fieldId}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
      />
      {error ? (
        <p id={errId} className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}