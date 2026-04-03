"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Button, Callout, Label } from "@visualify/design-system";
import {
  projectSettingsFieldWidthClass,
  projectSettingsInputClass,
} from "@/components/project/projectSettingsDsFormClasses";

const MIN_PASSWORD_LENGTH = 8;
const SUCCESS_RESET_MS = 4000;

type FieldKey = "current" | "new" | "confirm";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const id = setTimeout(() => setSuccessMessage(null), SUCCESS_RESET_MS);
    return () => clearTimeout(id);
  }, [successMessage]);

  function runValidation(): boolean {
    const errs: Partial<Record<FieldKey, string>> = {};
    if (!currentPassword.trim()) {
      errs.current = "Current password is required.";
    }
    const neu = newPassword.trim();
    if (!newPassword.trim()) {
      errs.new = "New password is required.";
    } else if (neu.length < MIN_PASSWORD_LENGTH) {
      errs.new = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword.trim()) {
      errs.confirm = "Confirm new password is required.";
    } else if (neu !== confirmPassword.trim()) {
      errs.confirm = "New password and confirmation do not match.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    if (!runValidation()) return;

    const supabase = supabaseBrowserClient();
    setSaving(true);
    try {
      const trimmedCurrent = currentPassword.trim();
      const nextPass = newPassword.trim();

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user?.email) {
        setFormError(
          userErr?.message ??
            "Password change requires an email sign-in. If you use another sign-in method, use “Forgot password” on the login page.",
        );
        return;
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: trimmedCurrent,
      });
      if (verifyErr) {
        const m = verifyErr.message ?? "";
        setFormError(
          /invalid login credentials/i.test(m) ? "Current password is incorrect." : m,
        );
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: nextPass,
      });
      if (updateErr) {
        setFormError(updateErr.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setSuccessMessage("Your password was updated.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3" noValidate>
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="settings-current-password" className="!mb-1">
          Current password{" "}
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
            *
          </span>
        </Label>
        <input
          id="settings-current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            if (fieldErrors.current) setFieldErrors((p) => ({ ...p, current: undefined }));
          }}
          className={projectSettingsInputClass(Boolean(fieldErrors.current))}
          autoComplete="current-password"
          disabled={saving}
          aria-invalid={Boolean(fieldErrors.current)}
          aria-describedby={fieldErrors.current ? "settings-current-password-err" : undefined}
        />
        {fieldErrors.current ? (
          <p id="settings-current-password-err" className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg)]">
            {fieldErrors.current}
          </p>
        ) : null}
      </div>
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="settings-new-password" className="!mb-1">
          New password{" "}
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
            *
          </span>
        </Label>
        <input
          id="settings-new-password"
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (fieldErrors.new) setFieldErrors((p) => ({ ...p, new: undefined }));
          }}
          className={projectSettingsInputClass(Boolean(fieldErrors.new))}
          autoComplete="new-password"
          disabled={saving}
          aria-invalid={Boolean(fieldErrors.new)}
          aria-describedby={fieldErrors.new ? "settings-new-password-err" : undefined}
        />
        {fieldErrors.new ? (
          <p id="settings-new-password-err" className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg)]">
            {fieldErrors.new}
          </p>
        ) : null}
      </div>
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="settings-confirm-password" className="!mb-1">
          Confirm new password{" "}
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
            *
          </span>
        </Label>
        <input
          id="settings-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirm) setFieldErrors((p) => ({ ...p, confirm: undefined }));
          }}
          className={projectSettingsInputClass(Boolean(fieldErrors.confirm))}
          autoComplete="new-password"
          disabled={saving}
          aria-invalid={Boolean(fieldErrors.confirm)}
          aria-describedby={fieldErrors.confirm ? "settings-confirm-password-err" : undefined}
        />
        {fieldErrors.confirm ? (
          <p
            id="settings-confirm-password-err"
            className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg)]"
          >
            {fieldErrors.confirm}
          </p>
        ) : null}
      </div>
      {formError ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {formError}
        </Callout>
      ) : null}
      {successMessage ? (
        <Callout status="success" role="status" className="text-[length:var(--ds-text-sm)]">
          {successMessage}
        </Callout>
      ) : null}
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
