import {
  dsAppLaunchTileInteractiveClass,
  dsAppLaunchTilePlaceholderClass,
} from "@visualify/design-system";
import { redirect } from "next/navigation";
import { DashboardWorkspacesSection } from "./dashboard-workspaces-section";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { isVisualifyStaffEmail } from "@/lib/auth/visualifyStaff";
import {
  fetchManageableWorkspacesForRail,
  resolveSelectedWorkspaceIdForRail,
} from "@/lib/workspace-settings-data";
import {
  type VisualifyAppDefinition,
  VISUALIFY_APP_CATALOG,
  VISUALIFY_STAFF_TEMPLATE_APP_DASHBOARD_TILE,
} from "@/lib/visualify-apps";
import {
  fetchAttachedWorkspaceProducts,
  partitionWorkspaceProductsForAppsPage,
} from "@/lib/workspace-apps-data";

export const dynamic = "force-dynamic";

/** Active (trial/subscribed) catalog apps for the selected workspace first; preserve catalog order within each band. */
function sortDashboardCatalogAppsByActiveWorkspaceSubscription(
  apps: VisualifyAppDefinition[],
  activeProductKeys: Set<string>,
): VisualifyAppDefinition[] {
  return apps
    .map((app, catalogOrder) => ({ app, catalogOrder }))
    .sort((a, b) => {
      const aActive = activeProductKeys.has(a.app.id);
      const bActive = activeProductKeys.has(b.app.id);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return a.catalogOrder - b.catalogOrder;
    })
    .map(({ app }) => app);
}

export default async function DashboardPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await fetchManageableWorkspacesForRail(user.id);
  const selectedWorkspaceId = await resolveSelectedWorkspaceIdForRail(user.id);

  let activeProductKeys = new Set<string>();
  if (selectedWorkspaceId) {
    const attached = await fetchAttachedWorkspaceProducts(selectedWorkspaceId);
    activeProductKeys = partitionWorkspaceProductsForAppsPage(attached).activeProductKeys;
  }

  const dashboardAppCatalog = sortDashboardCatalogAppsByActiveWorkspaceSubscription(
    isVisualifyStaffEmail(user.email)
      ? [...VISUALIFY_APP_CATALOG, VISUALIFY_STAFF_TEMPLATE_APP_DASHBOARD_TILE]
      : [...VISUALIFY_APP_CATALOG],
    activeProductKeys,
  );

  return (
      <div className="flex min-h-full flex-col items-start justify-start px-0 pb-10 pt-0">
        <main className="w-full max-w-none shrink-0 space-y-10">
          <div className="space-y-2.5">
            <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
              Visualify HQ
            </h1>
            <p className="max-w-xl text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
              Use the rail for Organisation, Apps, Billing, and your profile for account settings.
            </p>
          </div>

          <DashboardWorkspacesSection
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
          />

          <section aria-labelledby="dashboard-apps-heading" className="space-y-4">
            <h2
              id="dashboard-apps-heading"
              className="text-[length:var(--ds-text-lg)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
            >
              Apps
            </h2>

            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {dashboardAppCatalog.map((app) => (
                <li key={app.id} className="min-w-0">
                  {app.href ? (
                    <a
                      href={app.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={dsAppLaunchTileInteractiveClass}
                    >
                      <span className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                        {app.name}
                      </span>
                      <span className="mt-2 flex-1 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                        {app.description}
                      </span>
                      <span className="mt-3 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                        Open
                      </span>
                    </a>
                  ) : (
                    <div
                      className={`${dsAppLaunchTilePlaceholderClass} opacity-[0.88]`}
                      aria-disabled
                    >
                      <span className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-muted)]">
                        {app.name}
                      </span>
                      <span className="mt-2 flex-1 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-tertiary)]">
                        {app.description}
                      </span>
                      <span className="mt-3 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-muted)]">
                        Coming soon
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
  );
}
