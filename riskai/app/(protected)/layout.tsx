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
import { isAccountSettingsPath, isWorkspaceSelectionPath, HOME_PATH, NO_ACCESS_PATH } from "@/lib/routes";
import {
  parseSideNavPinnedCookie,
  SIDE_NAV_PINNED_COOKIE_NAME,
} from "@/lib/sideNavPinnedCookie";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";
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
  let hidePrimaryNav = false;

  if (user) {
    const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
    if (!entitled) {
      redirect(NO_ACCESS_PATH);
    }

    const workspaceContext = await resolveActiveRiskAiWorkspaceContext(user.id);
    workspaces = workspaceContext.workspaces;
    selectedWorkspaceId = workspaceContext.selectedWorkspaceId;
    const onWorkspaceSelection = isWorkspaceSelectionPath(pathname);
    /**
     * 2+ entitled workspaces with no valid active cookie: send the user to `/home`
     * (workspace selector) while keeping the signed-in App Shell. Account settings
     * stay reachable from the rail. `/home` itself is always the selector, even
     * after a workspace is already chosen (brand mark returns here).
     */
    if (
      workspaceContext.needsSelection &&
      !onWorkspaceSelection &&
      !isAccountSettingsPath(pathname)
    ) {
      const next = encodeURIComponent(pathname);
      redirect(`${HOME_PATH}?next=${next}`);
    }
    hidePrimaryNav = workspaceContext.needsSelection || onWorkspaceSelection;

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
      hidePrimaryNav={hidePrimaryNav}
    >
      {children}
    </ProtectedShell>
  );
}
