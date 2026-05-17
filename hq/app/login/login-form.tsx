"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  AppLoginCardHeader,
  AppLoginCardLegalFooter,
  appLoginCardLegalLinkClassName,
  AppLoginFormError,
  AppLoginPasswordField,
  appLoginFormClassName,
  AppLoginSubmitRow,
  appLoginSubmitLabelsForMode,
  AppLoginTabsSection,
  AppLoginTrustLine,
} from "@visualify/app-shell";
import { Button, Callout, Input, Label, Tab, Tabs } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type LoginTabId = "signin" | "signup";

function HqLoginSubmitRow() {
  const { pending } = useFormStatus();
  return <AppLoginSubmitRow pending={pending} />;
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
  const searchParams = useSearchParams();
  const modeRaw = searchParams.get("mode");
  const initialTab: LoginTabId =
    typeof modeRaw === "string" && modeRaw.trim().toLowerCase() === "signup" ? "signup" : "signin";

  const [tab, setTab] = useState<LoginTabId>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpAwaitingEmail, setSignUpAwaitingEmail] = useState(false);

  const signInError = tab === "signin" ? serverError : undefined;
  const signUpError = tab === "signup" ? clientError : null;

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setSignUpAwaitingEmail(false);
    setLoading(true);
    try {
      const { data, error: err } = await supabaseBrowserClient().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authConfirmUrl() },
      });
      if (err) {
        setClientError(formatAuthError(err));
        return;
      }
      if (data.session) {
        window.location.href = "/dashboard";
        return;
      }
      setSignUpAwaitingEmail(true);
    } catch (err) {
      setClientError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppLoginCardHeader />

      <AppLoginTabsSection>
        <Tabs className="max-w-full shrink-0">
          <Tab
            type="button"
            active={tab === "signin"}
            onClick={() => {
              setClientError(null);
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
              setClientError(null);
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
              <span className="break-all font-medium text-[var(--ds-text-primary)]">{email.trim()}</span>. Open it to
              finish signing up. If you do not see it, check your spam folder.
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
                setClientError(null);
                setSignUpAwaitingEmail(false);
                setTab("signin");
              }}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      ) : tab === "signin" ? (
        <form className={appLoginFormClassName} action="/api/auth/login" method="POST" autoComplete="on">
          <div>
            <Label htmlFor="hq-login-email">Email</Label>
            <Input
              id="hq-login-email"
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
            />
          </div>

          <AppLoginPasswordField
            id="hq-login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="current-password"
            required
          />

          <AppLoginFormError message={signInError} />

          <HqLoginSubmitRow />

          <AppLoginTrustLine />

          <AppLoginCardLegalFooter
            privacyLink={
              <Link href="#" className={appLoginCardLegalLinkClassName}>
                Privacy Policy
              </Link>
            }
            termsLink={
              <Link href="#" className={appLoginCardLegalLinkClassName}>
                Terms &amp; Conditions
              </Link>
            }
          />
        </form>
      ) : (
        <form className={appLoginFormClassName} onSubmit={handleSignUp} autoComplete="on">
          <div>
            <Label htmlFor="hq-signup-email">Email</Label>
            <Input
              id="hq-signup-email"
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
              disabled={loading}
            />
          </div>

          <AppLoginPasswordField
            id="hq-signup-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
            required
            minLength={6}
            disabled={loading}
          />

          <AppLoginFormError message={signUpError} />

          <AppLoginSubmitRow pending={loading} {...appLoginSubmitLabelsForMode("signup")} />
          <AppLoginTrustLine>Secure sign up | Your data is protected</AppLoginTrustLine>

          <AppLoginCardLegalFooter
            privacyLink={
              <Link href="#" className={appLoginCardLegalLinkClassName}>
                Privacy Policy
              </Link>
            }
            termsLink={
              <Link href="#" className={appLoginCardLegalLinkClassName}>
                Terms &amp; Conditions
              </Link>
            }
          />
        </form>
      )}
    </>
  );
}
