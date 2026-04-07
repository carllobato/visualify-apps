"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Callout, Input, Label } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { riskaiPath } from "@/lib/routes";
import { LoginChrome } from "../../../login/LoginChrome";

const DEFAULT_NEXT = riskaiPath("/portfolios");

type FactorLike = { id: string; factor_type: string; status?: string };

function pickTotpFactor(factors: { all?: FactorLike[]; totp?: FactorLike[] } | null) {
  const rawTotp = factors?.totp ?? [];
  const all = factors?.all ?? [];
  const list: FactorLike[] =
    rawTotp.length > 0 ? rawTotp : all.filter((f) => f.factor_type === "totp");
  const verified = list.find((f) => f.status === "verified");
  return verified ?? list[0] ?? null;
}

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return DEFAULT_NEXT;
}

export default function MfaVerifyPage() {
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const inviteTokenRaw = searchParams.get("invite_token");
  const inviteToken = typeof inviteTokenRaw === "string" ? inviteTokenRaw.trim() : "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function finishRedirect() {
    if (inviteToken) {
      window.location.href = `/invite?invite_token=${encodeURIComponent(inviteToken)}`;
      return;
    }
    window.location.href = safeNextPath(nextRaw);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    const supabase = supabaseBrowserClient();
    setLoading(true);
    try {
      const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) {
        setError(listErr.message);
        return;
      }

      const factor = pickTotpFactor(factorsData);
      if (!factor?.id) {
        setError("No authenticator is registered for this account. Sign in again or set up 2FA in settings.");
        return;
      }

      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challengeErr || !challengeData?.id) {
        setError(challengeErr?.message ?? "Could not start verification.");
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code: digits,
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }

      finishRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginChrome>
      <div className="w-full max-w-sm rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-[var(--ds-text-primary)]">Two-step verification</h1>
        <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
          Enter the code from your authenticator app to continue.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          {error ? (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {error}
            </Callout>
          ) : null}
          <div>
            <Label htmlFor="mfa-code">Authenticator code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              disabled={loading}
              maxLength={6}
              className="font-mono tracking-widest"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? "Verifying…" : "Continue"}
          </Button>
        </form>
      </div>
    </LoginChrome>
  );
}
