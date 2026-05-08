"use client";

import {
  VISUALIFY_APP_CATALOG,
  type VisualifyAppDefinition,
} from "@/lib/visualify-apps";
import { Card, CardContent, CardHeader } from "@visualify/design-system";

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
            No access
          </span>
        )}
      </div>
    </li>
  );
}

export function AppsAccessPanel({ grantedAppIds }: { grantedAppIds: readonly string[] }) {
  const grantedSet = new Set(grantedAppIds);
  const withAccess = VISUALIFY_APP_CATALOG.filter((a) => grantedSet.has(a.id));
  const withoutAccess = VISUALIFY_APP_CATALOG.filter((a) => !grantedSet.has(a.id));

  const cardClass =
    "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

  return (
    <section className="space-y-4">
      <Card variant="default" className={cardClass}>
        <CardHeader className="!px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Apps with access</h2>
        </CardHeader>
        <CardContent className="!px-4 !py-3">
          <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
            Visualify products your account can use. Access may come from your organisation or an invitation.
          </p>
          {withAccess.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-muted)]">
              You don&apos;t have access to any listed apps yet. Ask your administrator or check pending
              invitations.
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
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Apps without access</h2>
        </CardHeader>
        <CardContent className="!px-4 !py-3">
          <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
            Products in the Visualify suite that aren&apos;t enabled for your account right now.
          </p>
          {withoutAccess.length === 0 ? (
            <p className="text-sm text-[var(--ds-text-muted)]">
              Nothing to show—either every catalog app is enabled for you, or no other apps are listed yet.
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
