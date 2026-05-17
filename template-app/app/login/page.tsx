import { redirect } from "next/navigation";
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginForm } from "@/components/LoginForm";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AppLoginScreen
      brandHref="/"
      brandTitle="Visualify Template App"
      brandAriaLabel="Visualify Template App"
    >
      <AppLoginCardSuspense>
        <LoginForm />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
