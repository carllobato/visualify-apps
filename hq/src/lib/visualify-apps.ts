import {
  VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG,
  type AccountSettingsAppCatalogEntry,
} from "@visualify/app-shell";
import { getProductDashboardUrl, getProductOrigin } from "@visualify/urls";

/** RiskAI entry point (same as dashboard). */
export const RISKAI_DASHBOARD_URL = getProductDashboardUrl("riskai");

/** Host for app routes shared with RiskAI (legal pages, etc.). */
export const VISUALIFY_APP_ORIGIN = getProductOrigin("riskai");

/** Template App on the shared app host (HQ dashboard tile for Visualify staff only). */
export const TEMPLATE_APP_HQ_LAUNCH_URL = `${VISUALIFY_APP_ORIGIN}/template-app`;

export type VisualifyAppDefinition = AccountSettingsAppCatalogEntry;

/**
 * Default HQ app catalog tiles. Catalog `id` matches `visualify_products.key` for workspace entitlement checks.
 * Account → Apps and HQ launcher tiles share the platform catalog from app-shell.
 */
export const VISUALIFY_APP_CATALOG: VisualifyAppDefinition[] = [...VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG];

/** App launcher tile for HQ dashboard — append only when `isVisualifyStaffEmail` is true. */
export const VISUALIFY_STAFF_TEMPLATE_APP_DASHBOARD_TILE: VisualifyAppDefinition = {
  id: "template",
  name: "Template App",
  description: "Internal product scaffold and integration reference for Visualify staff.",
  href: TEMPLATE_APP_HQ_LAUNCH_URL,
};
