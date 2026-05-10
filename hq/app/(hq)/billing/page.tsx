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
        <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">Billing</h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          Subscription and invoice management will appear here.
        </p>
      </main>
  );
}
