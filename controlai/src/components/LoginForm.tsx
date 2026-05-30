"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AppLoginCardHeader,
  AppLoginFormError,
  AppLoginPasswordField,
  appLoginFormClassName,
  AppLoginStandardLegalFooter,
  AppLoginSubmitRow,
  appLoginSubmitLabelsForMode,
  AppLoginTabsSection,
  AppLoginTrustLine,
} from "@visualify/app-shell";
import { Button, Callout, Input, Label, Tab, Tabs } from "@visualify/design-system";
import { CONTROLAI_DEFAULT_ROUTE } from "@/lib/controlai-routes";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type LoginTabId = "signin" | "signup";

function authConfirmUrl(): string {
  return new URL("/auth/confirm", window.location.origin).toString();
}

function formatAuthError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export function LoginForm({ serverError }: { serverError?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<LoginTabId>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signUpAwaitingEmail, setSignUpAwaitingEmail] = useState(false);

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = supabaseBrowserClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(formatAuthError(signError));
        return;
      }
      router.push(CONTROLAI_DEFAULT_ROUTE);
      router.refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSignUpAwaitingEmail(false);
    setPending(true);
    try {
      const { data, error: signUpError } = await supabaseBrowserClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authConfirmUrl(),
        },
      });
      if (signUpError) {
        setError(formatAuthError(signUpError));
        return;
      }
      if (data.session) {
        router.push(CONTROLAI_DEFAULT_ROUTE);
        router.refresh();
        return;
      }
      setSignUpAwaitingEmail(true);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  }

  const legalFooter = <AppLoginStandardLegalFooter />;

  return (
    <>
      <AppLoginCardHeader />

      <AppLoginTabsSection>
        <Tabs className="max-w-full shrink-0">
          <Tab
            type="button"
            active={tab === "signin"}
            onClick={() => {
              setError(null);
              setSignUpAwaitingEmail(false);
              setShowPassword(false);
              setTab("signin");
            }}
          >
            Sign in
          </Tab>
          <Tab
            type="button"
            active={tab === "signup"}
            onClick={() => {
              setError(null);
              setSignUpAwaitingEmail(false);
              setShowPassword(false);
              setTab("signup");
            }}
          >
            Sign up
          </Tab>
        </Tabs>
      </AppLoginTabsSection>

      {tab === "signup" && signUpAwaitingEmail ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <Callout status="success" className="text-center text-[length:var(--ds-text-sm)]">
            <p className="font-medium text-[var(--ds-text-primary)]">Check your email</p>
            <p className="mt-1.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              We sent a confirmation link to{" "}
              <span className="break-all font-medium text-[var(--ds-text-primary)]">{email.trim()}</span>.
              Open it to finish signing up. If you do not see it, check your spam folder.
            </p>
          </Callout>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setSignUpAwaitingEmail(false);
                setPassword("");
              }}
            >
              Use a different email
            </Button>
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => {
                setError(null);
                setSignUpAwaitingEmail(false);
                setTab("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      ) : tab === "signin" ? (
        <form onSubmit={onSignIn} className={appLoginFormClassName} autoComplete="on">
          <div>
            <Label htmlFor="controlai-login-email">Email</Label>
            <Input
              id="controlai-login-email"
              name="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              required
              disabled={pending}
            />
          </div>

          <AppLoginPasswordField
            id="controlai-login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="current-password"
            required
            disabled={pending}
          />

          <AppLoginFormError message={tab === "signin" ? serverError ?? error : error} />
          <AppLoginSubmitRow pending={pending} />
          <AppLoginTrustLine />
          {legalFooter}
        </form>
      ) : (
        <form onSubmit={onSignUp} className={appLoginFormClassName} autoComplete="on">
          <div>
            <Label htmlFor="controlai-signup-email">Email</Label>
            <Input
              id="controlai-signup-email"
              name="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              required
              disabled={pending}
            />
          </div>

          <AppLoginPasswordField
            id="controlai-signup-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
            required
            minLength={6}
            disabled={pending}
          />

          <AppLoginFormError message={error} />
          <AppLoginSubmitRow pending={pending} {...appLoginSubmitLabelsForMode("signup")} />
          <AppLoginTrustLine>Secure sign up | Your data is protected</AppLoginTrustLine>
          {legalFooter}
        </form>
      )}
    </>
  );
}
