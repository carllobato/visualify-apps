import { AppShellOuterCanvas } from "@visualify/app-shell";
import { PlatformRail } from "./platform-rail";
import { HqSignedInDocument } from "./hq-signed-in-document";
import { getVisualifyAppCatalogForUser } from "@/lib/visualify-apps";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchManageableWorkspacesForRail,
  readVisualifyActiveWorkspaceIdFromCookie,
  type WorkspaceRailEntry,
} from "@/lib/workspace-settings-data";

/**
 * Full-height signed-in shell: quiet outer background, platform rail in flow beside
 * the workspace — rail width transitions on hover and the main column flexes to match.
 */
export async function HqSignedInShell({ children }: { children: React.ReactNode }) {
  const user = await resolveAuthenticatedUser();

  let workspaces: WorkspaceRailEntry[] = [];
  let selectedWorkspaceId: string | null = null;
  const appCatalog = getVisualifyAppCatalogForUser(user?.email);

  if (user) {
    const [railWorkspaces, cookieWorkspaceId] = await Promise.all([
      fetchManageableWorkspacesForRail(user.id),
      readVisualifyActiveWorkspaceIdFromCookie(),
    ]);
    workspaces = railWorkspaces;
    // Validate against the rail list already loaded above — same rule as
    // resolveSelectedWorkspaceIdForRail without a second fetchManageableWorkspacesInternal call.
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
