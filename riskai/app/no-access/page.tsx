import { redirect } from "next/navigation";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { productConfig } from "@/lib/product-config";
import { DASHBOARD_PATH } from "@/lib/routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { NoAccessClient } from "./NoAccessClient";

export const dynamic = "force-dynamic";

/**
 * Outside `(protected)` so the entitlement gate does not redirect here in a loop.
 * Auth required; entitled users are sent to the dashboard.
 */
export default async function NoAccessPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (entitled) {
    redirect(DASHBOARD_PATH);
  }

  return <NoAccessClient />;
}
