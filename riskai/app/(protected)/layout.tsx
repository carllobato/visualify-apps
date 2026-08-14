import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { buildEntitledAppShellCatalogForUser, type AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { productConfig } from "@/lib/product-config";
import { isAccountSettingsPath, NO_ACCESS_PATH } from "@/lib/routes";
import {
  parseSideNavPinnedCookie,
  SIDE_NAV_PINNED_COOKIE_NAME,
} from "@/lib/sideNavPinnedCookie";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";
import { WorkspaceSelectionEntryScreen } from "@/components/workspace/WorkspaceSelectionEntryScreen";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = (await headers()).get("x-pathname") ?? "/";

  if (!user && !isDevAuthBypassEnabled()) {
    redirect(await buildLoginRedirectUrl(pathname));
  }

  let appCatalog: readonly AppShellRailAppCatalogEntry[] = [];
  let workspaces: readonly EntitledWorkspace[] = [];
  let selectedWorkspaceId: string | null = null;

  if (user) {
    const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
    if (!entitled) {
      redirect(NO_ACCESS_PATH);
    }

    const workspaceContext = await resolveActiveRiskAiWorkspaceContext(user.id);
    workspaces = workspaceContext.workspaces;
    selectedWorkspaceId = workspaceContext.selectedWorkspaceId;

    /**
     * 2+ entitled workspaces with no valid active cookie: block App Shell / protected
     * pages until the user selects via the validated server action.
     * Account settings stay reachable from the selection rail.
     */
    if (workspaceContext.needsSelection && !isAccountSettingsPath(pathname)) {
      return <WorkspaceSelectionEntryScreen workspaces={workspaces} />;
    }

    const workspaceEntitledProductKeys = await fetchWorkspaceEntitledProductKeysForUser(supabase, user.id);
    appCatalog = buildEntitledAppShellCatalogForUser(workspaceEntitledProductKeys, user.email);
  }

  const cookieStore = await cookies();
  const pinnedFromCookie = parseSideNavPinnedCookie(
    cookieStore.get(SIDE_NAV_PINNED_COOKIE_NAME)?.value,
  );
  const initialSideNavPinned = pinnedFromCookie ?? true;
  return (
    <ProtectedShell
      initialSideNavPinned={initialSideNavPinned}
      appCatalog={appCatalog}
      workspaces={workspaces}
      selectedWorkspaceId={selectedWorkspaceId}
    >
      {children}
    </ProtectedShell>
  );
}
