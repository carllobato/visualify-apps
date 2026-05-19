import { AppShellPageHeader } from "@visualify/app-shell";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
      <main className="w-full max-w-2xl shrink-0">
        <AppShellPageHeader
          title="Billing"
          description="Subscription and invoice management will appear here."
        />
      </main>
  );
}
