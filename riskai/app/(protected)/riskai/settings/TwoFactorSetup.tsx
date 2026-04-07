"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Button, Callout, Label } from "@visualify/design-system";
import {
  projectSettingsFieldWidthClass,
  projectSettingsInputClass,
} from "@/components/project/projectSettingsDsFormClasses";

type Phase = "idle" | "enrolling" | "setup" | "verifying" | "success";

export function TwoFactorSetup({ totpAlreadyEnabled = false }: { totpAlreadyEnabled?: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const enrolling = phase === "enrolling";
  const verifying = phase === "verifying";
  const inSetup = phase === "setup";
  const disableEnableButton =
    totpAlreadyEnabled || enrolling || verifying || inSetup || phase === "success";

  async function handleEnable2FA() {
    setErrorMessage(null);
    const supabase = supabaseBrowserClient();
    setPhase("enrolling");
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setErrorMessage(userErr?.message ?? "You must be signed in to enable 2FA.");
        setPhase("idle");
        return;
      }

      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollErr || !data) {
        setErrorMessage(enrollErr?.message ?? "Could not start 2FA enrollment.");
        setPhase("idle");
        return;
      }

      const totp = data.totp;
      const qr = totp?.qr_code ?? null;
      const sec = totp?.secret ?? null;
      if (!data.id || !qr || !sec) {
        setErrorMessage("Enrollment response was incomplete. Try again.");
        setPhase("idle");
        return;
      }

      setFactorId(data.id);
      setQrCode(qr);
      setSecret(sec);
      setCode("");
      setPhase("setup");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setErrorMessage("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (!factorId) {
      setErrorMessage("Enrollment is missing. Click “Enable 2FA” again.");
      return;
    }

    const supabase = supabaseBrowserClient();
    setPhase("verifying");
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeErr || !challengeData?.id) {
        setErrorMessage(challengeErr?.message ?? "Could not create verification challenge.");
        setPhase("setup");
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: digits,
      });
      if (verifyErr) {
        setErrorMessage(verifyErr.message);
        setPhase("setup");
        return;
      }

      setPhase("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase("setup");
    }
  }

  function renderQr() {
    if (!qrCode) return null;
    const trimmed = qrCode.trim();
    if (trimmed.startsWith("data:")) {
      return (
        <img
          src={trimmed}
          alt="Scan this QR code with your authenticator app"
          className="h-44 w-44 max-w-full border border-[var(--ds-border)] bg-white p-2"
        />
      );
    }
    if (trimmed.startsWith("<svg")) {
      return (
        <div
          className="inline-block border border-[var(--ds-border)] bg-white p-2 [&_svg]:h-40 [&_svg]:w-40"
          // eslint-disable-next-line react/no-danger -- Supabase returns trusted SVG for TOTP QR
          dangerouslySetInnerHTML={{ __html: trimmed }}
          role="img"
          aria-label="Scan this QR code with your authenticator app"
        />
      );
    }
    return (
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`}
        alt="Scan this QR code with your authenticator app"
        className="h-44 w-44 max-w-full border border-[var(--ds-border)] bg-white p-2"
      />
    );
  }

  return (
    <div className="space-y-4">
      {phase === "success" ? (
        <Callout status="success" role="status" className="text-[length:var(--ds-text-sm)]">
          2FA enabled
        </Callout>
      ) : null}

      {errorMessage ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {errorMessage}
        </Callout>
      ) : null}

      {totpAlreadyEnabled && phase !== "success" ? (
        <Button type="button" variant="primary" disabled className="cursor-not-allowed">
          2FA already enabled
        </Button>
      ) : null}

      {!totpAlreadyEnabled && phase !== "success" ? (
        <Button
          type="button"
          variant="primary"
          disabled={disableEnableButton}
          onClick={() => void handleEnable2FA()}
        >
          {enrolling ? "Starting…" : "Enable 2FA"}
        </Button>
      ) : null}

      {inSetup || verifying ? (
        <div className="space-y-4 border-t border-[var(--ds-border)] pt-4">
          <div>
            <p className="mb-2 text-sm text-[var(--ds-text-secondary)]">
              Scan with an authenticator app (Google Authenticator, 1Password, etc.), or enter the secret
              manually.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">{renderQr()}</div>
          </div>

          {secret ? (
            <div className={projectSettingsFieldWidthClass("md")}>
              <p className="mb-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Manual code</p>
              <code className="block break-all rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2 font-mono text-sm text-[var(--ds-text-primary)]">
                {secret}
              </code>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleVerifySubmit(e)} className="space-y-3">
            <div className={projectSettingsFieldWidthClass("sm")}>
              <Label htmlFor="two-factor-verify-code" className="!mb-1">
                Authenticator code
              </Label>
              <input
                id="two-factor-verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={projectSettingsInputClass(false)}
                placeholder="000000"
                disabled={verifying}
              />
            </div>
            <Button type="submit" variant="primary" disabled={verifying || code.length !== 6}>
              {verifying ? "Verifying…" : "Verify and enable"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
