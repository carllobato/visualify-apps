import { redirect } from "next/navigation";
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { isAuthDisabled } from "@/lib/auth/auth-disabled";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isAuthDisabled()) {
    redirect("/dashboard");
  }

  const user = await resolveAuthenticatedUser();
  if (user) {
    redirect("/dashboard");
  }

  const { error: errorParam } = await searchParams;
  const serverError =
    typeof errorParam === "string" && errorParam.trim() ? errorParam.trim() : undefined;

  return (
    <AppLoginScreen brandHref="/" brandTitle="Visualify HQ" brandAriaLabel="Visualify HQ">
      <AppLoginCardSuspense>
        <LoginForm serverError={serverError} />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
