import { redirect } from "next/navigation";
import { CONTROLAI_DEFAULT_ROUTE } from "@/lib/controlai-routes";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(CONTROLAI_DEFAULT_ROUTE);
  }

  redirect("/login");
}
