import { AppShellLegalFooter } from "@visualify/app-shell";
import { VISUALIFY_APP_ORIGIN } from "@/lib/visualify-apps";

/** Matches RiskAI app shell footer; links use the shared app origin for privacy/terms routes. */
export function SiteLegalFooter() {
  return (
    <AppShellLegalFooter
      privacyHref={`${VISUALIFY_APP_ORIGIN}/privacy`}
      termsHref={`${VISUALIFY_APP_ORIGIN}/terms`}
    />
  );
}
