import { AppShellOuterCanvas, buildEntitledAppShellCatalogForUser } from "@visualify/app-shell";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { PlatformRail } from "./platform-rail";
import { HqSignedInDocument } from "./hq-signed-in-document";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchVisibleWorkspacesForRail,
  readVisualifyActiveWorkspaceIdFromCookie,
  type WorkspaceRailEntry,
} from "@/lib/workspace-settings-data";
import { supabaseServerClient } from "@/lib/supabase/server";

/**
 * Full-height signed-in shell: quiet outer background, platform rail in flow beside
 * the workspace — rail width transitions on hover and the main column flexes to match.
 */
export async function HqSignedInShell({ children }: { children: React.ReactNode }) {
  const user = await resolveAuthenticatedUser();

  let workspaces: WorkspaceRailEntry[] = [];
  let selectedWorkspaceId: string | null = null;
  let appCatalog = buildEntitledAppShellCatalogForUser([], user?.email);

  if (user) {
    const supabase = await supabaseServerClient();
    const [railWorkspaces, cookieWorkspaceId, workspaceEntitledProductKeys] = await Promise.all([
      fetchVisibleWorkspacesForRail(user.id),
      readVisualifyActiveWorkspaceIdFromCookie(),
      fetchWorkspaceEntitledProductKeysForUser(supabase, user.id),
    ]);
    workspaces = railWorkspaces;
    appCatalog = buildEntitledAppShellCatalogForUser(workspaceEntitledProductKeys, user.email);
    // Validate against the visible rail list already loaded above.
    selectedWorkspaceId =
      cookieWorkspaceId && workspaces.some((w) => w.id === cookieWorkspaceId)
        ? cookieWorkspaceId
        : null;
  }

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <PlatformRail
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        appCatalog={appCatalog}
      />

      <HqSignedInDocument>{children}</HqSignedInDocument>
    </AppShellOuterCanvas>
  );
}
