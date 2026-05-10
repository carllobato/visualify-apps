import { redirect } from "next/navigation";
import { isAuthDisabled } from "@/lib/auth/auth-disabled";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { HqPublicShell } from "../hq-public-shell";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (isAuthDisabled()) {
    redirect("/dashboard");
  }

  const user = await resolveAuthenticatedUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <HqPublicShell>
      <main className="w-full max-w-md shrink-0 px-4 py-2">
        <LoginForm />
        <p className="mt-4 text-center text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          © {new Date().getFullYear()} Visualify. All rights reserved.
        </p>
      </main>
    </HqPublicShell>
  );
}
