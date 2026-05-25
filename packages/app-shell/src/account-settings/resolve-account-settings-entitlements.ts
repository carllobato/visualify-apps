import { isVisualifyStaffEmail } from "../auth/isVisualifyStaffEmail";
import type { AccountSettingsAppCatalogEntry } from "./visualify-account-app-catalog";
import {
  VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG,
  VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG,
} from "./visualify-account-app-catalog";

/** Account → Apps / app-switcher catalog for the signed-in user (includes staff-only apps when applicable). */
export function buildVisualifyAccountAppCatalogForUser(
  userEmail: string | null | undefined,
): readonly AccountSettingsAppCatalogEntry[] {
  if (!isVisualifyStaffEmail(userEmail)) {
    return VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG;
  }
  return [...VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG, ...VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG];
}

/**
 * Workspace entitlement keys for Account → Apps. Visualify staff (`@visualify.com.au`) are treated as
 * entitled to every app in {@link buildVisualifyAccountAppCatalogForUser} without changing workspace checks.
 */
export function resolveAccountSettingsEntitledProductKeys(
  workspaceEntitledProductKeys: readonly string[],
  userEmail: string | null | undefined,
  appCatalog: readonly AccountSettingsAppCatalogEntry[] = buildVisualifyAccountAppCatalogForUser(userEmail),
): readonly string[] {
  if (!isVisualifyStaffEmail(userEmail)) {
    return workspaceEntitledProductKeys;
  }
  const keys = new Set(workspaceEntitledProductKeys);
  for (const app of appCatalog) {
    const id = app.id?.trim();
    if (id) keys.add(id);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}
