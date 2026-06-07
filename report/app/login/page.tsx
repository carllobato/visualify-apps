import { redirect } from "next/navigation";
import { AppLoginCardSuspense, AppLoginScreen } from "@visualify/app-shell";
import { LoginForm } from "@/components/LoginForm";
import { REPORT_DEFAULT_ROUTE } from "@/lib/report-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(REPORT_DEFAULT_ROUTE);
  }

  const params = await searchParams;
  const errorParam = params.error;
  const serverError =
    typeof errorParam === "string" && errorParam.trim() ? errorParam.trim() : undefined;

  return (
    <AppLoginScreen
      brandHref="/"
      brandTitle="Visualify Report"
      brandAriaLabel="Visualify Report"
    >
      <AppLoginCardSuspense>
        <LoginForm serverError={serverError} />
      </AppLoginCardSuspense>
    </AppLoginScreen>
  );
}
