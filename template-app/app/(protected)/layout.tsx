import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellLegalFooter,
  AppShellMainColumn,
  AppShellOuterCanvas,
  AppShellScrollRegion,
} from "@visualify/app-shell";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { productConfig } from "@/lib/product-config";
import { supabaseServerClient } from "@/lib/supabase/server";
import { TemplateAppShellRail } from "@/components/TemplateAppShellRail";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = (await headers()).get("x-pathname") ?? "/dashboard";

  if (!user) {
    redirect(buildLoginRedirectUrl(pathname));
  }

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  const legalOrigin = new URL(productConfig.HQ_APPS_URL).origin;

  return (
    <AppShellOuterCanvas>
      <TemplateAppShellRail />
      <AppShellMainColumn>
        <AppShellFrameGutter>
          <AppShellFramedSurface>
            <AppShellScrollRegion
              footer={
                <AppShellLegalFooter
                  privacyHref={`${legalOrigin}/privacy`}
                  termsHref={`${legalOrigin}/terms`}
                />
              }
            >
              {children}
            </AppShellScrollRegion>
          </AppShellFramedSurface>
        </AppShellFrameGutter>
      </AppShellMainColumn>
    </AppShellOuterCanvas>
  );
}
