import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginClient } from "./LoginClient";

/**
 * Canonical logged-out login UI for RiskAI (app-host `/` and website `/login`).
 */
export function RiskAiLoggedOutLoginScreen() {
  return (
    <AppLoginScreen brandHref="/" brandTitle="Visualify RiskAI" brandAriaLabel="Visualify RiskAI">
      <AppLoginCardSuspense>
        <LoginClient />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
