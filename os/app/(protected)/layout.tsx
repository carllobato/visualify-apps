import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShellOuterCanvas } from "@visualify/app-shell";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { productConfig } from "@/lib/product-config";
import { OS_DEFAULT_ROUTE } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { OsAppShellRail } from "@/components/layout/OsAppShellRail";
import { OsProtectedDocument } from "@/components/layout/OsProtectedDocument";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = (await headers()).get("x-pathname") ?? OS_DEFAULT_ROUTE;

  if (!user) {
    redirect(buildLoginRedirectUrl(pathname));
  }

  const productKey = productConfig.PRODUCT_KEY;
  let entitled = false;
  try {
    entitled = await hasProductAccess(user.id, productKey);
  } catch (err) {
    console.error("[visualify-os-entitlement-debug] hasProductAccess error:", err);
  }

  console.log(
    JSON.stringify({
      tag: "visualify-os-entitlement-debug",
      userId: user.id,
      productKey,
      entitled,
    }),
  );

  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <OsAppShellRail />
      <OsProtectedDocument>{children}</OsProtectedDocument>
    </AppShellOuterCanvas>
  );
}
