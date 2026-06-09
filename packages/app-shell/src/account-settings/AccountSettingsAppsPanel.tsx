"use client";

import {
  AccountSettingsCard,
  AccountSettingsCardContent,
  AccountSettingsCardHeader,
} from "./AccountSettingsCard";
import { accountSettingsIntroTextClassName, accountSettingsPanelSectionClassName } from "./classes";
import type { AccountSettingsAppCatalogEntry } from "./visualify-account-app-catalog";
import {
  buildVisualifyAccountAppCatalogForUser,
  resolveAccountSettingsEntitledProductKeys,
} from "./resolve-account-settings-entitlements";

function AppRow({ app, access }: { app: AccountSettingsAppCatalogEntry; access: "granted" | "denied" }) {
  const canOpen = access === "granted" && Boolean(app.href?.trim());

  return (
    <li className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--ds-text-primary)]">{app.name}</div>
          {app.description ? (
            <p className="mt-0.5 text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
              {app.description}
            </p>
          ) : null}
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

export type AccountSettingsAppsPanelProps = {
  /** `visualify_products.key` values from workspaces where the user has membership + trial/active subscription. */
  workspaceEntitledProductKeys: readonly string[];
  /** Signed-in user email — when `@visualify.com.au`, staff see the full catalog as entitled. */
  userEmail?: string | null;
  appCatalog?: readonly AccountSettingsAppCatalogEntry[];
};

export function AccountSettingsAppsPanel({
  workspaceEntitledProductKeys,
  userEmail,
  appCatalog: appCatalogProp,
}: AccountSettingsAppsPanelProps) {
  const appCatalog = appCatalogProp ?? buildVisualifyAccountAppCatalogForUser(userEmail);
  const effectiveEntitledKeys = resolveAccountSettingsEntitledProductKeys(
    workspaceEntitledProductKeys,
    userEmail,
    appCatalog,
  );
  const entitledSet = new Set(effectiveEntitledKeys);
  const withAccess = appCatalog.filter((a) => entitledSet.has(a.id));

  return (
    <section className={accountSettingsPanelSectionClassName}>
      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Apps from your workspaces" />
        <AccountSettingsCardContent>
          <p className={accountSettingsIntroTextClassName}>
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
        </AccountSettingsCardContent>
      </AccountSettingsCard>
    </section>
  );
}
