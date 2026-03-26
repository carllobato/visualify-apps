"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";

export default function DevLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      const { error: err } = await supabaseBrowserClient().auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setStatus("Sign up successful. You may need to confirm your email, or you can Sign In.");
      window.location.href = "/riskai/dev/user";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      const { error: err } = await supabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setStatus("Signed in.");
      window.location.href = "/riskai/dev/user";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <form className="space-y-3 max-w-sm">
      <div>
        <label htmlFor="dev-email" className="mb-1 block text-sm font-medium text-[var(--ds-text-secondary)]">
          Email
        </label>
        <input
          id="dev-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-[var(--ds-text-primary)]"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <label htmlFor="dev-password" className="mb-1 block text-sm font-medium text-[var(--ds-text-secondary)]">
          Password
        </label>
        <input
          id="dev-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-[var(--ds-text-primary)]"
          required
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSignUp}
          className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm font-medium hover:bg-[var(--ds-surface-hover)]"
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={handleSignIn}
          className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm font-medium hover:bg-[var(--ds-surface-hover)]"
        >
          Sign In
        </button>
      </div>
      {status && (
        <Callout status="success" role="status" className="text-[length:var(--ds-text-sm)]">
          {status}
        </Callout>
      )}
      {error && (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {error}
        </Callout>
      )}
    </form>
  );
}
