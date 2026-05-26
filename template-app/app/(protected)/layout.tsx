import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShellLegalFooterWithModals, AppShellOuterCanvas } from "@visualify/app-shell";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { isVisualifyStaffEmail } from "@/lib/auth/visualifyStaff";
import { productConfig } from "@/lib/product-config";
import { supabaseServerClient } from "@/lib/supabase/server";
import { TemplateAppShellRail } from "@/components/layout/TemplateAppShellRail";
import { TemplateProtectedDocument } from "@/components/layout/TemplateProtectedDocument";

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

  if (!isVisualifyStaffEmail(user.email)) {
    redirect(productConfig.HQ_APPS_URL);
  }

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <TemplateAppShellRail />
      <TemplateProtectedDocument footer={<AppShellLegalFooterWithModals />}>
        {children}
      </TemplateProtectedDocument>
    </AppShellOuterCanvas>
  );
}
