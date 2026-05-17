import { Suspense, type ReactNode } from "react";
import { AppLoginCard } from "./AppLoginCard";
import { AppLoginSuspenseFallback } from "./AppLoginSuspenseFallback";

export type AppLoginCardSuspenseProps = {
  children: ReactNode;
  /** Accessible label for the Suspense fallback skeleton. */
  suspenseLabel?: string;
};

/**
 * **Canonical login card boundary** — required child of {@link AppLoginScreen}.
 *
 * Wraps {@link AppLoginCard} + `Suspense` + {@link AppLoginSuspenseFallback} so hydrate
 * does not shift layout. Apps must not recreate this `Card` + `Suspense` pair locally.
 *
 * Put the app-owned client login form (tabs, fields, auth handlers) as `children`.
 *
 * @see ./LOGIN_ARCHITECTURE.md
 */
export function AppLoginCardSuspense({ children, suspenseLabel }: AppLoginCardSuspenseProps) {
  return (
    <AppLoginCard>
      <Suspense fallback={<AppLoginSuspenseFallback label={suspenseLabel} />}>
        {children}
      </Suspense>
    </AppLoginCard>
  );
}
