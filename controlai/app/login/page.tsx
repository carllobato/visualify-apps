import { redirect } from "next/navigation";
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginForm } from "@/components/LoginForm";
import { CONTROLAI_DEFAULT_ROUTE } from "@/lib/controlai-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(CONTROLAI_DEFAULT_ROUTE);
  }

  return (
    <AppLoginScreen
      brandHref="/"
      brandTitle="Visualify ControlAI"
      brandAriaLabel="Visualify ControlAI"
    >
      <AppLoginCardSuspense>
        <LoginForm />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
