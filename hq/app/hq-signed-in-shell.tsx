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
    <div className="flex min-h-dvh bg-[color-mix(in_oklab,var(--ds-surface-muted)_24%,var(--ds-canvas))] text-[var(--ds-text-primary)]">
      <PlatformRail workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <div className="box-border flex min-h-0 flex-1 flex-col p-2 sm:p-2.5">
          <div
            className={
              "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[var(--ds-radius-app-frame)] " +
              "bg-[var(--ds-surface)] shadow-[var(--ds-elevation-app-frame)]"
            }
          >
            <div className="box-border flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--ds-surface)] px-2.5 py-3 sm:px-4 sm:py-4">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="min-h-0 min-w-0 flex-1">{children}</div>
                <div className="mt-auto shrink-0">
                  <SiteLegalFooter />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
