import { redirect } from "next/navigation";
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginForm } from "@/components/LoginForm";
import { REPORT_ROUTES } from "@/lib/report-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(REPORT_ROUTES.projects);
  }

  return (
    <AppLoginScreen
      brandHref="/"
      brandTitle="Visualify Report"
      brandAriaLabel="Visualify Report"
    >
      <AppLoginCardSuspense>
        <LoginForm />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
