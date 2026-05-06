import Link from "next/link";
import { Card, CardContent } from "@visualify/design-system";

/** Primary action styles aligned with `Button` variant="primary" size="md" for anchor navigation. */
const primaryCtaClass =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--ds-radius-md)] px-4 " +
  "text-[length:var(--ds-text-sm)] font-medium no-underline " +
  "bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] " +
  "transition-all duration-150 ease-out hover:bg-[var(--ds-primary-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

export default function HomePage() {
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
            <CardContent className="space-y-8 px-6 py-8">
              <div className="space-y-3">
                <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
                  Welcome to Visualify HQ
                </h1>
                <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  Manage your Visualify apps, users, workspaces and access from one place.
                </p>
              </div>

              <div className="space-y-4">
                <Link href="/login" className={primaryCtaClass}>
                  Sign in
                </Link>
                <p className="text-center text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
                  RiskAI access will continue to run separately during the transition.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
