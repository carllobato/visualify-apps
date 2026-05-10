import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { AccountSettingsClient } from "./account-settings-client";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const firstName = typeof meta?.first_name === "string" ? meta.first_name.trim() || null : null;
  const lastName = typeof meta?.last_name === "string" ? meta.last_name.trim() || null : null;
  const company = typeof meta?.company === "string" ? meta.company.trim() || null : null;
  const role = typeof meta?.role === "string" ? meta.role.trim() || null : null;

  return (
      <main className="w-full max-w-2xl shrink-0 px-0 pb-4">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">Account settings</h1>
        <p className="mb-8 text-sm text-[var(--ds-text-secondary)]">Your account details.</p>

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
  );
}
