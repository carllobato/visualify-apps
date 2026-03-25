import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { DASHBOARD_PATH } from "@/lib/routes";
import { LoginChrome } from "./login/LoginChrome";
import { LoginPageShell } from "./login/LoginPageShell";

/**
 * Root host entry: login when signed out; signed-in users go to dashboard.
 */
export default async function HomePage() {
  await headers();
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <LoginChrome>
      <LoginPageShell />
    </LoginChrome>
  );
}
