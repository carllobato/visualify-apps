import Link from "next/link";
import { Button, Card, CardContent, Input, Label, Tab, Tabs } from "@visualify/design-system";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ds-background)] text-[var(--ds-text-primary)]">
      <div className="fixed inset-x-0 top-0 z-20">
        <header className="ds-app-top-nav flex h-14 shrink-0 items-center justify-between gap-[var(--ds-space-3)] px-[var(--ds-space-2)]">
          <div className="flex min-w-0 items-center gap-[var(--ds-space-3)]">
            <Link
              href="/"
              className="inline-flex h-9 items-center px-[var(--ds-space-2)] text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight text-[var(--ds-text-primary)] no-underline transition-colors hover:text-[var(--ds-text-secondary)]"
            >
              Visualify
            </Link>
          </div>
        </header>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 pb-8 pt-16">
        <main className="w-full max-w-md shrink-0">
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

              <form className="space-y-3" autoComplete="on">
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

                <div className="flex justify-center pt-1">
                  <Button type="button" variant="primary" className="max-w-full min-w-0 whitespace-normal text-center">
                    Sign in
                  </Button>
                </div>

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
          <p className="mt-4 text-center text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            © {new Date().getFullYear()} Visualify. All rights reserved.
          </p>
        </main>
      </div>
    </div>
  );
}
