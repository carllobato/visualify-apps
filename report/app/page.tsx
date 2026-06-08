import { redirect } from "next/navigation";
import { reportDefaultPostLoginPath } from "@/lib/report-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(reportDefaultPostLoginPath());
  }

  redirect("/login");
}
