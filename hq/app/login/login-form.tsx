"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Button, Card, CardContent, Input, Label, Tab, Tabs } from "@visualify/design-system";

function SubmitRow() {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-center pt-1">
      <Button type="submit" variant="primary" disabled={pending} className="max-w-full min-w-0 whitespace-normal text-center">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </div>
  );
}

export function LoginForm({ serverError }: { serverError?: string }) {
  return (
    <Card
      variant="default"
      className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
    >
      <CardContent className="px-5 py-5">
        <h1 className="mb-4 text-center text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
          Welcome to Visualify
        </h1>

        <div className="mb-4 w-full">
          <div className="flex justify-center">
            <Tabs className="max-w-full shrink-0">
              <Tab type="button" active>
                Sign in
              </Tab>
              <Tab type="button" active={false}>
                Sign up
              </Tab>
            </Tabs>
          </div>
          <div className="h-px w-full bg-[var(--ds-border)]" aria-hidden />
        </div>

        <form className="space-y-3" action="/api/auth/login" method="POST" autoComplete="on">
          <div>
            <Label htmlFor="hq-login-email">Email</Label>
            <Input
              id="hq-login-email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              required
            />
          </div>

          <div>
            <Label htmlFor="hq-login-password">Password</Label>
            <Input
              id="hq-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>

          {serverError ? (
            <p role="alert" className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-danger)]">
              {serverError}
            </p>
          ) : null}

          <SubmitRow />

          <p className="mt-2 text-center text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
            Secure login | Your data is protected
          </p>

          <footer className="border-t border-[var(--ds-border)] pt-4">
            <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
              <Link href="#" className="ds-text-link-muted text-[length:var(--ds-text-xs)]">
                Privacy Policy
              </Link>
              <span className="select-none text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]" aria-hidden>
                ·
              </span>
              <Link href="#" className="ds-text-link-muted text-[length:var(--ds-text-xs)]">
                Terms &amp; Conditions
              </Link>
            </nav>
          </footer>
        </form>
      </CardContent>
    </Card>
  );
}
