import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { DASHBOARD_PATH } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await headers();
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(DASHBOARD_PATH);
  }

  redirect("/login");
}
