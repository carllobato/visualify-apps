"use client";

import Link from "next/link";
import { LegalDocumentLink } from "@/components/legal/LegalDocumentLink";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Callout, Input, Label, Tab, Tabs } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { DASHBOARD_PATH } from "@/lib/routes";

type LoginTabId = "signin" | "signup";

/** Crossfade / collapse timing when switching Sign in ↔ Sign up */
const tabSwitchMs = "duration-[250ms]";
const tabSwitchEase = "ease-in-out";
const tabCrossfadeClass = `transition-opacity ${tabSwitchMs} ${tabSwitchEase}`;
const tabCollapseGridClass = `grid overflow-hidden transition-[grid-template-rows] ${tabSwitchMs} ${tabSwitchEase}`;

/** Toggle to show the Google / Microsoft row again. */
const SHOW_SOCIAL_LOGIN = false;

function IconGoogle({ className }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden width={18} height={18}>
      <path
        fill="currentColor"
        d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 3.988 15.139 3 12.545 3 7.021 3 2.543 7.477 2.543 12s4.478 9 10.002 9c8.396 0 10.249-7.85 9.537-13.961H12.545z"
      />
    </svg>
  );
}

function IconMicrosoft({ className }: { className?: string }) {
  return (
    <svg className={`pointer-events-none ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden width={18} height={18}>
      <path fill="currentColor" d="M2 2h9.5v9.5H2V2z" />
      <path fill="currentColor" d="M12.5 2H22v9.5h-9.5V2z" />
      <path fill="currentColor" d="M2 12.5h9.5V22H2v-9.5z" />
      <path fill="currentColor" d="M12.5 12.5H22V22h-9.5v-9.5z" />
    </svg>
  );
}

function LoginSocialProviders({
  tab,
  formLoading,
  next,
  onClearFormError,
  onError,
}: {
  tab: LoginTabId;
  formLoading: boolean;
  next: string;
  onClearFormError: () => void;
  onError: (message: string) => void;
}) {
  const [microsoftOAuthLoading, setMicrosoftOAuthLoading] = useState(false);

  const handleMicrosoftOAuth = async () => {
    onClearFormError();
    setMicrosoftOAuthLoading(true);
    try {
      const path = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;
      const { data, error: err } = await supabaseBrowserClient().auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo,
          scopes: "email",
          skipBrowserRedirect: true,
        },
      });
      if (err) {
        onError(err.message);
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setMicrosoftOAuthLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3" role="separator" aria-label="Alternative sign-in options">
        <div className="h-px flex-1 bg-[var(--ds-border)]" />
        <span className="relative inline-flex min-h-[1rem] shrink-0 items-center justify-center text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-secondary)]">
          <span
            className={`whitespace-nowrap ${tabCrossfadeClass} ${
              tab === "signin" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
            }`}
          >
            Or continue with
          </span>
          <span
            className={`whitespace-nowrap ${tabCrossfadeClass} ${
              tab === "signup" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
            }`}
          >
            Sign up with
          </span>
        </span>
        <div className="h-px flex-1 bg-[var(--ds-border)]" />
      </div>

      <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:gap-2.5">
        <Button type="button" variant="secondary" disabled title="Coming soon" className="w-full justify-center sm:flex-1">
          <IconGoogle className="shrink-0 text-[var(--ds-text-primary)]" />
          Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleMicrosoftOAuth()}
          disabled={formLoading || microsoftOAuthLoading}
          title={microsoftOAuthLoading ? "Redirecting…" : undefined}
          className="w-full justify-center sm:flex-1"
        >
          <IconMicrosoft className="shrink-0 text-[var(--ds-text-primary)]" />
          {microsoftOAuthLoading ? "Redirecting…" : "Microsoft"}
        </Button>
      </div>
    </div>
  );
}

export function LoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? DASHBOARD_PATH;

  const [tab, setTab] = useState<LoginTabId>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetFormState = () => {
    setError(null);
  };

  useEffect(() => {
    const oauthErr = searchParams.get("error");
    if (oauthErr?.trim()) {
      setError(decodeURIComponent(oauthErr));
    }
  }, [searchParams]);

  const redirectAfterAuth = () => {
    const path = next.startsWith("/") && !next.startsWith("//") ? next : DASHBOARD_PATH;
    window.location.href = path;
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);
    try {
      const { error: err } = await supabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);
    try {
      const { error: err } = await supabaseBrowserClient().auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        return;
      }
      redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = tab === "signin" ? handleSignIn : handleSignUp;

  const legalLinkClass = "ds-text-link-muted text-[length:var(--ds-text-xs)]";

  return (
    <div className="w-full">
      <div className="mb-4 w-full">
        <div className="flex justify-center">
          <Tabs className="max-w-full shrink-0">
            <Tab
              type="button"
              active={tab === "signin"}
              onClick={() => {
                if (tab !== "signin") resetFormState();
                setTab("signin");
              }}
            >
              Sign in
            </Tab>
            <Tab
              type="button"
              active={tab === "signup"}
              onClick={() => {
                if (tab !== "signup") resetFormState();
                setTab("signup");
              }}
            >
              Sign up
            </Tab>
          </Tabs>
        </div>
        <div className="h-px w-full bg-[var(--ds-border)]" aria-hidden />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-14"
              required
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              disabled={loading}
              minLength={6}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 min-h-0 -translate-y-1/2 px-2 py-1"
              onClick={() => setShowPassword((v) => !v)}
              disabled={loading}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <div
          className={`${tabCollapseGridClass} ${error ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          aria-hidden={!error}
        >
          <div className="min-h-0 overflow-hidden">
            {error ? (
              <div className="space-y-1.5 text-center">
                <Callout status="danger" role="alert" className="text-center text-[length:var(--ds-text-sm)]">
                  {error}
                </Callout>
                {tab === "signin" && (
                  <div>
                    <Link
                      href="/forgot-password"
                      className="ds-text-link-muted text-[length:var(--ds-text-xs)]"
                    >
                      Trouble signing in?
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center pt-1">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="relative max-w-full min-w-0 whitespace-normal text-center"
          >
            {loading ? (
              <span className={`flex min-h-[1.25rem] items-center justify-center ${tabCrossfadeClass}`}>
                Please wait…
              </span>
            ) : (
              <>
                <span
                  className={`flex min-h-[1.25rem] items-center justify-center ${tabCrossfadeClass} ${
                    tab === "signin"
                      ? "relative"
                      : "pointer-events-none absolute inset-0 opacity-0"
                  }`}
                >
                  Continue to RiskAI
                </span>
                <span
                  className={`flex min-h-[1.25rem] items-center justify-center ${tabCrossfadeClass} ${
                    tab === "signup"
                      ? "relative"
                      : "pointer-events-none absolute inset-0 opacity-0"
                  }`}
                >
                  Sign up
                </span>
              </>
            )}
          </Button>
        </div>
        <div className="relative mt-2">
          <p
            className={`text-center text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)] ${tabCrossfadeClass} ${
              tab === "signin" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
            }`}
            aria-hidden={tab !== "signin"}
          >
            Secure login | Your data is protected
          </p>
          <p
            className={`text-center text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)] ${tabCrossfadeClass} ${
              tab === "signup" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
            }`}
            aria-hidden={tab !== "signup"}
          >
            Secure sign up | Your data is protected
          </p>
        </div>
      </form>

      {SHOW_SOCIAL_LOGIN ? (
        <LoginSocialProviders
          tab={tab}
          formLoading={loading}
          next={next}
          onClearFormError={resetFormState}
          onError={setError}
        />
      ) : null}

      <footer className="mt-6 border-t border-[var(--ds-border)] pt-4">
        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <LegalDocumentLink document="privacy" className={legalLinkClass}>
            Privacy Policy
          </LegalDocumentLink>
          <span className="select-none text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]" aria-hidden>
            ·
          </span>
          <LegalDocumentLink document="terms" className={legalLinkClass}>
            Terms &amp; Conditions
          </LegalDocumentLink>
        </nav>
      </footer>
    </div>
  );
}
