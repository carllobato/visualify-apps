"use client";

import {
  VISUALIFY_APP_CATALOG,
  type VisualifyAppDefinition,
} from "@/lib/visualify-apps";
import { Card, CardContent, CardHeader } from "@visualify/design-system";

/**
 * Account → Apps: read-only view of catalog vs workspace-backed entitlements.
 * Users are identities; billing and product enablement live on workspaces. Open links only when a workspace
 * grants the product (trial/active) and the catalog lists an `href`.
 */
function AppRow({ app, access }: { app: VisualifyAppDefinition; access: "granted" | "denied" }) {
  const canOpen = access === "granted" && Boolean(app.href?.trim());

  return (
    <li className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--ds-text-primary)]">{app.name}</div>
          <p className="mt-0.5 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
            {app.description}
          </p>
        </div>
        {canOpen ? (
          <a
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-1.5 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
          >
            Open
          </a>
        ) : (
          <span className="inline-flex shrink-0 items-center text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">
            {access === "denied" ? "Not enabled on a workspace" : "No launch URL"}
          </span>
        )}
      </div>
    </li>
  );
}

export function AppsAccessPanel({
  workspaceEntitledProductKeys,
}: {
  /** `visualify_products.key` values from any workspace where the signed-in user has membership + trial/active subscription. */
  workspaceEntitledProductKeys: readonly string[];
}) {
  const entitledSet = new Set(workspaceEntitledProductKeys);
  const withAccess = VISUALIFY_APP_CATALOG.filter((a) => entitledSet.has(a.id));
  const withoutAccess = VISUALIFY_APP_CATALOG.filter((a) => !entitledSet.has(a.id));

  const cardClass =
    "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

  return (
    <section className="space-y-4">
      <Card variant="default" className={cardClass}>
        <CardHeader className="!px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Apps from your workspaces</h2>
        </CardHeader>
        <CardContent className="!px-4 !py-3">
          <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
            Products appear here when you belong to a workspace that has enabled them with an active or trial
            subscription. Access always follows workspace membership and that workspace&apos;s billing state—not
            your user account alone.
          </p>
          {withAccess.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-muted)]">
              None of the listed apps are enabled for you through a workspace yet. Ask a workspace admin to invite
              you or enable a product for a workspace you belong to.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {withAccess.map((app) => (
                <AppRow key={app.id} app={app} access="granted" />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card variant="default" className={cardClass}>
        <CardHeader className="!px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Catalog apps not enabled yet</h2>
        </CardHeader>
        <CardContent className="!px-4 !py-3">
          <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
            Other Visualify products in the catalog. They become available when a workspace you belong to enables
            them (subscriptions are attached to workspaces).
          </p>
          {withoutAccess.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-muted)]">
              Every catalog app listed here is enabled for you through at least one workspace, or there are no
              additional catalog entries.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {withoutAccess.map((app) => (
                <AppRow key={app.id} app={app} access="denied" />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
