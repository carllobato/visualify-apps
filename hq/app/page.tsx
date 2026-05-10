import { redirect } from "next/navigation";
import { isAuthDisabled } from "@/lib/auth/auth-disabled";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (isAuthDisabled()) {
    redirect("/dashboard");
  }

  const user = await resolveAuthenticatedUser();
  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
