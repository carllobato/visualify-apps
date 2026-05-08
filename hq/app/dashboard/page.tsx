import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@visualify/design-system";
import { supabaseServerClient } from "@/lib/supabase/server";
import { RISKAI_DASHBOARD_URL } from "@/lib/visualify-apps";
import { AppHeader } from "../app-header";

export const dynamic = "force-dynamic";

/** Primary action styles aligned with `Button` variant="primary" size="md" for anchor navigation. */
const primaryCtaClass =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--ds-radius-md)] px-4 " +
  "text-[length:var(--ds-text-sm)] font-medium no-underline " +
  "bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] " +
  "transition-all duration-150 ease-out hover:bg-[var(--ds-primary-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

export default async function DashboardPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ds-background)] text-[var(--ds-text-primary)]">
      <AppHeader />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 pb-8 pt-16">
        <main className="w-full max-w-md shrink-0 space-y-8">
          <div className="space-y-3">
            <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
              Visualify HQ
            </h1>
            <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
              Manage your apps, workspaces and access.
            </p>
          </div>

          <Card
            variant="default"
            className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
          >
            <CardHeader>
              <CardTitle className="text-[var(--ds-text-primary)]">RiskAI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                Risk management, simulations and reporting.
              </p>
              <a
                href={RISKAI_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryCtaClass}
              >
                Open RiskAI
              </a>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
