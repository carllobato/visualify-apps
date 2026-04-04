"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";

const inputClass =
  "w-full rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2.5 text-sm text-[var(--ds-text-primary)] transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-[var(--ds-text-muted)] " +
  "focus:border-[var(--ds-text-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--ds-text-primary)_18%,transparent)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "dark:border-[var(--ds-border)] dark:bg-[var(--ds-surface-inset)] dark:text-[var(--ds-text-primary)] dark:placeholder:text-[var(--ds-text-muted)] " +
  "dark:focus:border-[var(--ds-border-subtle)] dark:focus:ring-[color-mix(in_oklab,var(--ds-border-subtle)_22%,transparent)]";

const primaryButtonClass =
  "mt-1 w-full cursor-pointer rounded-[var(--ds-radius-sm)] border border-transparent bg-[var(--ds-text-primary)] px-4 py-3 text-sm font-semibold text-[var(--ds-text-inverse)] transition-[background-color,border-color] duration-200 ease-out hover:border-[var(--ds-control-strong-border-hover)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_88%,var(--ds-surface-default))] active:border-[var(--ds-control-strong-border-active)] active:bg-[color-mix(in_oklab,var(--ds-text-primary)_78%,var(--ds-surface-default))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 " +
  "dark:border-[var(--ds-border)]/50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] dark:hover:border-[var(--ds-border)]/75 dark:hover:bg-[var(--ds-surface-hover)] dark:active:border-[var(--ds-border)]/85 dark:active:bg-[var(--ds-surface-muted)] dark:focus-visible:outline-[var(--ds-border)]";

const subtleLinkClass =
  "text-xs text-[var(--ds-text-secondary)] transition-colors duration-200 ease-in-out hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border)]";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error: err } = await supabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full space-y-4 text-center">
        <p className="text-sm text-[var(--ds-text-secondary)]">
          If an account exists for <span className="font-medium text-[var(--ds-text-primary)]">{email}</span>, you
          will receive an email with a link to reset your password.
        </p>
        <Link href="/login" className={`inline-block font-medium ${subtleLinkClass}`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <p className="text-sm text-[var(--ds-text-secondary)]">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <div>
        <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-[var(--ds-text-primary)]">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      {error ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {error}
        </Callout>
      ) : null}

      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <div className="pt-1 text-center">
        <Link href="/login" className={subtleLinkClass}>
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
