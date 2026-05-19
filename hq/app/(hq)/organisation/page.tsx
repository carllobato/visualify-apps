import { AppShellPageHeader } from "@visualify/app-shell";
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
        <AppShellPageHeader
          title="Organisation"
          description="Organisation profile and membership will appear here. Workspace creation (the billing boundary for Visualify apps) will be coordinated from this area as the platform rollout continues."
        />
      </main>
  );
}
