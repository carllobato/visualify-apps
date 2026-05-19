import { AppShellPageHeader } from "@visualify/app-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@visualify/design-system";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  fetchAttachedWorkspaceProducts,
  isBillableSubscriptionStatus,
  partitionWorkspaceProductsForAppsPage,
} from "@/lib/workspace-apps-data";
import {
  fetchManageableWorkspaceById,
  readVisualifyActiveWorkspaceIdFromCookie,
} from "@/lib/workspace-settings-data";
import { VISUALIFY_APP_CATALOG } from "@/lib/visualify-apps";

export const dynamic = "force-dynamic";

const primaryCtaClass =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--ds-radius-md)] px-4 " +
  "text-[length:var(--ds-text-sm)] font-medium no-underline " +
  "bg-[var(--ds-primary)] text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] " +
  "transition-all duration-150 ease-out hover:bg-[var(--ds-primary-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

const secondaryCtaClass =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] px-4 " +
  "text-[length:var(--ds-text-sm)] font-medium no-underline text-[var(--ds-text-primary)] " +
  "bg-[var(--ds-surface-default)] shadow-[var(--ds-shadow-sm)] " +
  "transition-colors hover:bg-[var(--ds-surface-hover)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

export default async function AppsPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const cookieWorkspaceId = await readVisualifyActiveWorkspaceIdFromCookie();

  if (!cookieWorkspaceId) {
    return (
      <main className="w-full min-w-0 px-0 pb-10 pt-0">
        <AppShellPageHeader
          title="Apps"
          description="Select a workspace in the rail to view active apps and products you can add."
          className="mb-8"
        />
        <Card
          variant="default"
          className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
        >
          <CardContent className="pt-6">
            <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
              No workspace is selected. Choose a workspace from the left rail first.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const manageable = await fetchManageableWorkspaceById(user.id, cookieWorkspaceId);
  if (!manageable) {
    return (
      <main className="w-full min-w-0 px-0 pb-10 pt-0">
        <AppShellPageHeader
          title="Apps"
          description="You need workspace admin access to manage apps for this workspace."
          className="mb-8"
        />
        <Card
          variant="default"
          className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
        >
          <CardContent className="pt-6">
            <p className="mb-4 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
              This workspace can&apos;t be administered from HQ with your current role, or it isn&apos;t in
              your list. Pick another workspace from the rail.
            </p>
            <Link
              href="/workspace-settings"
              className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
            >
              Workspace overview
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const attached = await fetchAttachedWorkspaceProducts(manageable.id);
  const { active: activeProducts, activeProductKeys } = partitionWorkspaceProductsForAppsPage(attached);

  const inactiveCatalogApps = VISUALIFY_APP_CATALOG.filter((app) => !activeProductKeys.has(app.id)).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  const activeCatalogRows = activeProducts.filter((p) =>
    VISUALIFY_APP_CATALOG.some((c) => c.id === p.productKey),
  );
  const activeExtraFromDb = activeProducts.filter(
    (p) => !VISUALIFY_APP_CATALOG.some((c) => c.id === p.productKey),
  );

  return (
    <main className="w-full min-w-0 px-0 pb-10 pt-0">
      <AppShellPageHeader
        title="Apps"
        description={
          <>
            Managing apps for{" "}
            <span className="font-medium text-[var(--ds-text-primary)]">{manageable.name}</span>. Active apps
            have an ongoing subscription; inactive catalog apps can be enabled from Billing.
          </>
        }
        className="mb-8"
      />

      <div className="space-y-10">
        <section aria-labelledby="active-apps-heading" className="space-y-4">
          <h2
            id="active-apps-heading"
            className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]"
          >
            Active apps
          </h2>

          {activeCatalogRows.length === 0 && activeExtraFromDb.length === 0 ? (
            <Card
              variant="default"
              className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
            >
              <CardContent className="pt-6">
                <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  No apps have an active or trial subscription for this workspace yet. Use Billing to start or
                  resume a product, or add one from the list below.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {[...activeCatalogRows].sort((a, b) => a.productName.localeCompare(b.productName)).map((row) => {
                const catalog = VISUALIFY_APP_CATALOG.find((a) => a.id === row.productKey);
                const title = catalog?.name ?? row.productName;
                const description =
                  catalog?.description ?? "Open this product from your workspace subscription.";

                return (
                  <Card
                    key={row.productKey}
                    variant="default"
                    className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
                  >
                    <CardHeader>
                      <CardTitle className="text-[var(--ds-text-primary)]">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                        {description}
                      </p>

                      <p className="text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
                        <span className="font-medium text-[var(--ds-text-primary)]">{manageable.name}</span>
                        {manageable.slug ? (
                          <span className="text-[var(--ds-text-tertiary)]"> · {manageable.slug}</span>
                        ) : null}
                        <span>
                          {" "}
                          · {row.subscriptionStatus}
                          {row.plan ? ` · ${row.plan}` : ""}
                        </span>
                      </p>

                      {catalog?.href ? (
                        <a
                          href={catalog.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={primaryCtaClass}
                        >
                          Open {catalog.name}
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}

              {activeExtraFromDb.map((row) => (
                <Card
                  key={`extra-${row.productKey}`}
                  variant="default"
                  className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
                >
                  <CardHeader>
                    <CardTitle className="text-[var(--ds-text-primary)]">{row.productName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                      Product access for this workspace (not listed in the default catalog entry).
                    </p>
                    <p className="text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
                      <span className="font-medium text-[var(--ds-text-primary)]">{manageable.name}</span>
                      <span>
                        {" "}
                        · {row.subscriptionStatus}
                        {row.plan ? ` · ${row.plan}` : ""}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="inactive-apps-heading" className="space-y-4">
          <h2
            id="inactive-apps-heading"
            className="text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]"
          >
            Inactive apps
          </h2>
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            Visualify products you can add to this workspace. Enable or resume them from Billing.
          </p>

          {inactiveCatalogApps.length === 0 ? (
            <Card
              variant="default"
              className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
            >
              <CardContent className="pt-6">
                <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                  Every catalog app with an available plan already has an active or trial subscription for this
                  workspace.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {inactiveCatalogApps.map((catalog) => (
                <Card
                  key={catalog.id}
                  variant="default"
                  className="w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]"
                >
                  <CardHeader>
                    <CardTitle className="text-[var(--ds-text-primary)]">{catalog.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
                      {catalog.description}
                    </p>
                    {(() => {
                      const existing = attached.find((a) => a.productKey === catalog.id);
                      if (
                        existing &&
                        !isBillableSubscriptionStatus(existing.subscriptionStatus)
                      ) {
                        return (
                          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-tertiary)]">
                            Current subscription status:{" "}
                            <span className="font-medium text-[var(--ds-text-secondary)]">
                              {existing.subscriptionStatus || "—"}
                            </span>
                            . Resume or change plans from Billing.
                          </p>
                        );
                      }
                      if (!existing) {
                        return (
                          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-tertiary)]">
                            Not yet enabled for this workspace.
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <Link href="/billing" className={secondaryCtaClass}>
                      Add or enable in Billing
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
