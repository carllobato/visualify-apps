import {
  VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG,
  VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG,
  buildVisualifyAccountAppCatalogForUser,
  type AccountSettingsAppCatalogEntry,
} from "@visualify/app-shell";
import { getProductDashboardUrl, getProductOrigin } from "@visualify/urls";

/** RiskAI entry point (same as dashboard). */
export const RISKAI_DASHBOARD_URL = getProductDashboardUrl("riskai");

/** Host for app routes shared with RiskAI (legal pages, etc.). */
export const VISUALIFY_APP_ORIGIN = getProductOrigin("riskai");

export type VisualifyAppDefinition = AccountSettingsAppCatalogEntry;

/**
 * Default HQ app catalog tiles. Catalog `id` matches `visualify_products.key` for workspace entitlement checks.
 * Account → Apps and HQ workspace Apps page share this base catalog; app switchers use {@link getVisualifyAppCatalogForUser}.
 */
export const VISUALIFY_APP_CATALOG: VisualifyAppDefinition[] = [...VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG];

/** @deprecated Use {@link VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG} from app-shell. */
export const VISUALIFY_STAFF_TEMPLATE_APP_DASHBOARD_TILE: VisualifyAppDefinition =
  VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG[0]!;

/** App launcher / account catalog for a signed-in user (includes staff-only apps when applicable). */
export function getVisualifyAppCatalogForUser(
  userEmail: string | null | undefined,
): readonly VisualifyAppDefinition[] {
  return buildVisualifyAccountAppCatalogForUser(userEmail);
}
