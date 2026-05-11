import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellOuterCanvas,
  AppShellScrollRegion,
} from "@visualify/app-shell";
import { PlatformRail } from "./platform-rail";
import { SiteLegalFooter } from "@/components/site-legal-footer";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchManageableWorkspacesForRail,
  resolveSelectedWorkspaceIdForRail,
} from "@/lib/workspace-settings-data";

/**
 * Full-height signed-in shell: quiet outer background, platform rail in flow beside
 * the workspace — rail width transitions on hover and the main column flexes to match.
 */
export async function HqSignedInShell({ children }: { children: React.ReactNode }) {
  const user = await resolveAuthenticatedUser();
  const workspaces = user ? await fetchManageableWorkspacesForRail(user.id) : [];
  const selectedWorkspaceId = user ? await resolveSelectedWorkspaceIdForRail(user.id) : null;

  return (
    <AppShellOuterCanvas>
      <PlatformRail workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />

      <AppShellMainColumn>
        <AppShellFrameGutter>
          <AppShellFramedSurface>
            <AppShellScrollRegion footer={<SiteLegalFooter />}>{children}</AppShellScrollRegion>
          </AppShellFramedSurface>
        </AppShellFrameGutter>
      </AppShellMainColumn>
    </AppShellOuterCanvas>
  );
}
