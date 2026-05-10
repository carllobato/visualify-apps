import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { HqSignedInShell } from "../hq-signed-in-shell";

export const dynamic = "force-dynamic";

export default async function OrganisationPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <HqSignedInShell>
      <main className="w-full max-w-2xl shrink-0">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">Organisation</h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Organisation profile and membership will appear here.
        </p>
      </main>
    </HqSignedInShell>
  );
}
