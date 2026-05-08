import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { AppHeader } from "../app-header";
import { AccountSettingsClient } from "./account-settings-client";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const firstName = typeof meta?.first_name === "string" ? meta.first_name.trim() || null : null;
  const lastName = typeof meta?.last_name === "string" ? meta.last_name.trim() || null : null;
  const company = typeof meta?.company === "string" ? meta.company.trim() || null : null;
  const role = typeof meta?.role === "string" ? meta.role.trim() || null : null;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--ds-background)] text-[var(--ds-text-primary)]">
      <AppHeader />

      <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-10 pt-16 sm:px-6">
        <main className="w-full max-w-2xl shrink-0">
          <h1 className="mb-1 text-2xl font-semibold text-[var(--ds-text-primary)]">Account settings</h1>
          <p className="mb-6 text-sm text-[var(--ds-text-secondary)]">Your account details.</p>

          <AccountSettingsClient
            email={user.email ?? null}
            userId={user.id}
            firstName={firstName}
            lastName={lastName}
            company={company}
            role={role}
            grantedAppIds={["riskai"]}
          />

          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]"
          >
            ← Back to HQ
          </Link>
        </main>
      </div>
    </div>
  );
}
