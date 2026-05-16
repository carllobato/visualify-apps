import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
export const dynamic = "force-dynamic";

export default async function OrganisationPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
      <main className="w-full max-w-2xl shrink-0">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">Organisation</h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Organisation profile and membership will appear here. Workspace creation (the billing boundary for
          Visualify apps) will be coordinated from this area as the platform rollout continues.
        </p>
      </main>
  );
}
