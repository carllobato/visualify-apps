import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellLegalFooterWithModals,
  AppShellMainColumn,
  AppShellOuterCanvas,
  AppShellScrollRegion,
} from "@visualify/app-shell";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { productConfig } from "@/lib/product-config";
import { OS_DEFAULT_ROUTE } from "@/lib/os-routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { OsAppShellRail } from "@/components/layout/OsAppShellRail";

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

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  return (
    <AppShellOuterCanvas>
      <OsAppShellRail />
      <AppShellMainColumn>
        <AppShellFrameGutter>
          <AppShellFramedSurface>
            <AppShellScrollRegion footer={<AppShellLegalFooterWithModals />}>
              {children}
            </AppShellScrollRegion>
          </AppShellFramedSurface>
        </AppShellFrameGutter>
      </AppShellMainColumn>
    </AppShellOuterCanvas>
  );
}
