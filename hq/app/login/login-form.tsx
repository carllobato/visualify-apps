"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  AppLoginCardHeader,
  AppLoginCardLegalFooter,
  AppShellLegalDocumentLink,
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
import { inviteErrorUserMessage } from "@/lib/auth/inviteAuthMessages";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type LoginTabId = "signin" | "signup";

function HqLoginSubmitRow() {
  const { pending } = useFormStatus();
  return <AppLoginSubmitRow pending={pending} />;
}

function authConfirmUrl(params?: { inviteToken: string; invitedEmail?: string }): string {
  const url = new URL("/auth/confirm", window.location.origin);
  const inviteToken = params?.inviteToken.trim();
  if (inviteToken) {
    url.searchParams.set("invite_token", inviteToken);
    const invitedEmail = params?.invitedEmail?.trim();
    if (invitedEmail) url.searchParams.set("invited_email", invitedEmail);
  }
  return url.toString();
}

function formatAuthError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export function LoginForm({ serverError }: { serverError?: string }) {
  const searchParams = useSearchParams();
  const inviteTokenRaw = searchParams.get("invite_token");
  const inviteToken = typeof inviteTokenRaw === "string" ? inviteTokenRaw.trim() : "";
  const invitedEmailRaw = searchParams.get("invited_email");
  const invitedEmail =
    typeof invitedEmailRaw === "string" ? invitedEmailRaw.trim().toLowerCase() : "";
  const modeRaw = searchParams.get("mode");
  const initialTab: LoginTabId =
    typeof modeRaw === "string" && modeRaw.trim().toLowerCase() === "signup" ? "signup" : "signin";
  const inviteErrorRaw = searchParams.get("invite_error");
  const inviteErrorMessage = inviteErrorUserMessage(
    typeof inviteErrorRaw === "string" ? inviteErrorRaw : undefined
  );
  const inviteConflict = searchParams.get("invite_conflict") === "1";

  const [tab, setTab] = useState<LoginTabId>(initialTab);
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpAwaitingEmail, setSignUpAwaitingEmail] = useState(false);

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  const redirectAfterAuth = () => {
    if (inviteToken) {
      const inviteUrl = new URL("/invite", window.location.origin);
      inviteUrl.searchParams.set("invite_token", inviteToken);
      if (invitedEmail) inviteUrl.searchParams.set("invited_email", invitedEmail);
      if (modeRaw?.trim()) inviteUrl.searchParams.set("mode", modeRaw.trim());
      window.location.href = inviteUrl.toString();
      return;
    }
    window.location.href = "/dashboard";
  };

  const inviteErrorForForm = inviteConflict ? undefined : inviteErrorMessage;
  const signInError = tab === "signin" ? serverError ?? inviteErrorForForm : undefined;
  const signUpError = tab === "signup" ? clientError ?? inviteErrorForForm : null;

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setSignUpAwaitingEmail(false);
    setLoading(true);
    try {
      const { data, error: err } = await supabaseBrowserClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authConfirmUrl(
            inviteToken ? { inviteToken, invitedEmail: invitedEmail || undefined } : undefined,
          ),
          data: inviteToken ? { hq_invite_token: inviteToken } : {},
        },
      });
      if (err) {
        setClientError(formatAuthError(err));
        return;
      }
      if (data.session) {
        redirectAfterAuth();
        return;
      }
      setSignUpAwaitingEmail(true);
    } catch (err) {
      setClientError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const inviteContextFields = inviteToken ? (
    <>
      <input type="hidden" name="invite_token" value={inviteToken} />
      {invitedEmail ? <input type="hidden" name="invited_email" value={invitedEmail} /> : null}
      {modeRaw?.trim() ? <input type="hidden" name="mode" value={modeRaw.trim()} /> : null}
    </>
  ) : null;

  const legalFooter = (
    <AppLoginCardLegalFooter
      privacyLink={
        <AppShellLegalDocumentLink document="privacy" className={appLoginCardLegalLinkClassName}>
          Privacy Policy
        </AppShellLegalDocumentLink>
      }
      termsLink={
        <AppShellLegalDocumentLink document="terms" className={appLoginCardLegalLinkClassName}>
          Terms &amp; Conditions
        </AppShellLegalDocumentLink>
      }
    />
  );

  return (
    <>
      <AppLoginCardHeader />

      {inviteToken ? (
        <Callout status="info" className="mb-3 text-center text-[length:var(--ds-text-sm)]">
          <p className="font-medium text-[var(--ds-text-primary)]">Workspace invitation</p>
          <p className="mt-1.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            {invitedEmail
              ? `Sign in or create an account with ${invitedEmail} to join the workspace.`
              : "Sign in or create an account to accept your workspace invitation."}
          </p>
        </Callout>
      ) : null}

      {inviteConflict && inviteErrorMessage ? (
        <Callout status="warning" className="mb-3 text-center text-[length:var(--ds-text-sm)]">
          {inviteErrorMessage}
        </Callout>
      ) : null}

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
        <SignUpAwaitingPanel
          email={email}
          inviteToken={inviteToken}
          onUseDifferentEmail={() => {
            setSignUpAwaitingEmail(false);
            setPassword("");
          }}
          onBackToSignIn={() => {
            setClientError(null);
            setSignUpAwaitingEmail(false);
            setTab("signin");
          }}
        />
      ) : tab === "signin" ? (
        <form className={appLoginFormClassName} action="/api/auth/login" method="POST" autoComplete="on">
          {inviteContextFields}
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
          {legalFooter}
        </form>
      ) : (
        <form className={appLoginFormClassName} onSubmit={handleSignUp} autoComplete="on">
          <SignUpFieldsSection
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
            signUpError={signUpError ?? null}
            legalFooter={legalFooter}
          />
        </form>
      )}
    </>
  );
}

function SignUpFieldsSection({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  signUpError,
  legalFooter,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  loading: boolean;
  signUpError: string | null;
  legalFooter: ReactNode;
}) {
  return (
    <>
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
      {legalFooter}
    </>
  );
}

function SignUpAwaitingPanel({
  email,
  inviteToken,
  onUseDifferentEmail,
  onBackToSignIn,
}: {
  email: string;
  inviteToken: string;
  onUseDifferentEmail: () => void;
  onBackToSignIn: () => void;
}) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <Callout status="success" className="text-center text-[length:var(--ds-text-sm)]">
        <p className="font-medium text-[var(--ds-text-primary)]">Check your email</p>
        <p className="mt-1.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          We sent a confirmation link to{" "}
          <span className="break-all font-medium text-[var(--ds-text-primary)]">{email.trim()}</span>. Open it to
          finish signing up{inviteToken ? " and accept your workspace invitation" : ""}. If you do not see it, check
          your spam folder.
        </p>
      </Callout>
      <SignUpAwaitingActions
        onUseDifferentEmail={onUseDifferentEmail}
        onBackToSignIn={onBackToSignIn}
      />
    </div>
  );
}

function SignUpAwaitingActions({
  onUseDifferentEmail,
  onBackToSignIn,
}: {
  onUseDifferentEmail: () => void;
  onBackToSignIn: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onUseDifferentEmail}>
        Use a different email
      </Button>
      <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={onBackToSignIn}>
        Back to sign in
      </Button>
    </div>
  );
}
