import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { buildEntitledAppShellCatalogForUser, type AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import {
  parseSideNavPinnedCookie,
  SIDE_NAV_PINNED_COOKIE_NAME,
} from "@/lib/sideNavPinnedCookie";
import { resolveRiskAiAuthenticatedLayoutState } from "@/lib/workspace/resolveRiskAiAuthenticatedEntry";
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

  /**
   * AUTHENTICATED = HAS ACCESS TO RISKAI.
   * Workspace membership decides which Workspaces can be opened, not app entry.
   */
  let appCatalog: readonly AppShellRailAppCatalogEntry[] = [];
  let workspaces: readonly EntitledWorkspace[] = [];
  let selectedWorkspaceId: string | null = null;
  let hidePrimaryNav = false;

  if (user) {
    const workspaceContext = await resolveActiveRiskAiWorkspaceContext(user.id);
    workspaces = workspaceContext.workspaces;
    selectedWorkspaceId = workspaceContext.selectedWorkspaceId;
    const entry = resolveRiskAiAuthenticatedLayoutState({
      pathname,
      workspaceCount: workspaceContext.workspaces.length,
      selectedWorkspaceId: workspaceContext.selectedWorkspaceId,
      needsSelection: workspaceContext.needsSelection,
    });
    if (entry.redirectTo) {
      redirect(entry.redirectTo);
    }
    hidePrimaryNav = entry.hidePrimaryNav;

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
