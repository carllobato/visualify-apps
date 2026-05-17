import { redirect } from "next/navigation";
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { isAuthDisabled } from "@/lib/auth/auth-disabled";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type LoginSearchParams = Record<string, string | string[] | undefined>;

function getParam(params: LoginSearchParams, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function inviteAcceptUrl(params: LoginSearchParams): string | null {
  const inviteToken = getParam(params, "invite_token").trim();
  if (!inviteToken) return null;
  const sp = new URLSearchParams();
  sp.set("invite_token", inviteToken);
  const invitedEmail = getParam(params, "invited_email").trim();
  if (invitedEmail) sp.set("invited_email", invitedEmail);
  const mode = getParam(params, "mode").trim();
  if (mode) sp.set("mode", mode);
  return `/invite?${sp.toString()}`;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  if (isAuthDisabled()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const user = await resolveAuthenticatedUser();
  if (user) {
    const inviteUrl = inviteAcceptUrl(params);
    redirect(inviteUrl ?? "/dashboard");
  }

  const errorParam = getParam(params, "error");
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
