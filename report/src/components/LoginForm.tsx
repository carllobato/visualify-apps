"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AppLoginCardHeader,
  AppLoginFormError,
  AppLoginPasswordField,
  appLoginFormClassName,
  AppLoginSignInSignUpTabs,
  type AppLoginTabId,
  AppLoginSignUpAwaitingEmailPanel,
  AppLoginStandardLegalFooter,
  AppLoginSubmitRow,
  appLoginSubmitLabelsForMode,
  AppLoginTrustLine,
  navigateAfterAppLoginSuccess,
} from "@visualify/app-shell";
import { Input, Label } from "@visualify/design-system";
import { reportDefaultPostLoginPath, reportReturnPathAfterWorkspaceSelection } from "@/lib/report-routes";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next === "/") {
    return reportDefaultPostLoginPath();
  }
  return reportReturnPathAfterWorkspaceSelection(next);
}

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
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AppLoginTabId>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signUpAwaitingEmail, setSignUpAwaitingEmail] = useState(false);

  function resetTabState(nextTab: AppLoginTabId) {
    setError(null);
    setSignUpAwaitingEmail(false);
    setShowPassword(false);
    setTab(nextTab);
  }

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
      await navigateAfterAppLoginSuccess(router, safeNextPath(searchParams.get("next")));
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
        await navigateAfterAppLoginSuccess(router, safeNextPath(searchParams.get("next")));
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

      <AppLoginSignInSignUpTabs activeTab={tab} onTabChange={resetTabState} />

      {tab === "signup" && signUpAwaitingEmail ? (
        <AppLoginSignUpAwaitingEmailPanel
          email={email}
          onUseDifferentEmail={() => {
            setSignUpAwaitingEmail(false);
            setPassword("");
          }}
          onBackToSignIn={() => resetTabState("signin")}
        />
      ) : tab === "signin" ? (
        <form onSubmit={onSignIn} className={appLoginFormClassName} autoComplete="on">
          <div>
            <Label htmlFor="report-login-email">Email</Label>
            <Input
              id="report-login-email"
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
            id="report-login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="current-password"
            required
            disabled={pending}
          />

          <AppLoginFormError message={serverError ?? error} />

          <AppLoginSubmitRow pending={pending} />

          <AppLoginTrustLine />

          {legalFooter}
        </form>
      ) : (
        <form onSubmit={onSignUp} className={appLoginFormClassName} autoComplete="on">
          <div>
            <Label htmlFor="report-signup-email">Email</Label>
            <Input
              id="report-signup-email"
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
            id="report-signup-password"
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
