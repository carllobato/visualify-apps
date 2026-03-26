import { Suspense } from "react";
import { Card, CardContent } from "@visualify/design-system";
import { LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";
import { LoginClient } from "./LoginClient";

/** Card + LoginClient only (wrapped by LoginChrome on routes that use it). */
export function LoginPageShell() {
  return (
    <main className="w-full max-w-md shrink-0">
      <Card
        variant="default"
        className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
      >
        <CardContent className="px-5 py-5">
          <h1 className="mb-4 text-center text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
            Welcome to Visualify
          </h1>
          <Suspense fallback={<LoadingPlaceholderCompact className="text-center" label="Loading sign-in" />}>
            <LoginClient />
          </Suspense>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
        © {new Date().getFullYear()} Visualify. All rights reserved.
      </p>
    </main>
  );
}
