import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShellOuterCanvas } from "@visualify/app-shell";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { productConfig } from "@/lib/product-config";
import { CONTROLAI_DEFAULT_ROUTE, CONTROLAI_ROUTES } from "@/lib/controlai-routes";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ControlAiAppShellRail } from "@/components/layout/ControlAiAppShellRail";
import { ControlAiProtectedDocument } from "@/components/layout/ControlAiProtectedDocument";

function isSelectWorkspacePath(pathname: string): boolean {
  return (
    pathname === CONTROLAI_ROUTES.selectWorkspace ||
    pathname.startsWith(`${CONTROLAI_ROUTES.selectWorkspace}/`)
  );
}

function buildSelectWorkspaceRedirectUrl(returnPath: string): string {
  const next = encodeURIComponent(returnPath);
  return `${CONTROLAI_ROUTES.selectWorkspace}?next=${next}`;
}

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = (await headers()).get("x-pathname") ?? CONTROLAI_DEFAULT_ROUTE;

  if (!user) {
    redirect(buildLoginRedirectUrl(pathname));
  }

  const productKey = productConfig.PRODUCT_KEY;
  let entitled = false;
  try {
    entitled = await hasProductAccess(user.id, productKey);
  } catch (err) {
    console.error("[visualify-controlai] hasProductAccess error:", err);
  }

  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);

  if (workspaceContext.needsSelection && !isSelectWorkspacePath(pathname)) {
    redirect(buildSelectWorkspaceRedirectUrl(pathname));
  }

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <ControlAiAppShellRail
        workspaces={workspaceContext.workspaces}
        selectedWorkspaceId={workspaceContext.selectedWorkspaceId}
      />
      <ControlAiProtectedDocument>{children}</ControlAiProtectedDocument>
    </AppShellOuterCanvas>
  );
}
