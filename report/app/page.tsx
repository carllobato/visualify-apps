import { redirect } from "next/navigation";
import { REPORT_DEFAULT_ROUTE } from "@/lib/report-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(REPORT_DEFAULT_ROUTE);
  }

  redirect("/login");
}
