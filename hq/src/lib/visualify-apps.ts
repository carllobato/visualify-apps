import {
  VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG,
  VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG,
  buildVisualifyAccountAppCatalogForUser,
  type AccountSettingsAppCatalogEntry,
} from "@visualify/app-shell";
import { getProductDashboardUrl, getProductOrigin, readPublicEnv } from "@visualify/urls";

/** RiskAI entry point (same as dashboard). */
export const RISKAI_DASHBOARD_URL = getProductDashboardUrl("riskai");

const REPORT_DEFAULT_ORIGIN = "https://report.visualify.com.au";

/** Same resolver as Account → Apps catalog ({@link VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG}), evaluated at call time. */
function resolveReportLaunchHref(): string | null {
  const origin = (readPublicEnv("NEXT_PUBLIC_REPORT_ORIGIN") ?? REPORT_DEFAULT_ORIGIN).replace(/\/$/, "");
  return origin ? `${origin}/projects` : null;
}

export function resolveVisualifyAppLaunchHref(productKey: string): string | null {
  const id = productKey.trim().toLowerCase();
  if (id === "report") {
    return resolveReportLaunchHref();
  }
  const entry = VISUALIFY_APP_CATALOG.find((a) => a.id === id);
  return entry?.href?.trim() || null;
}

export function isActiveWorkspaceProductSubscription(status: string | null | undefined): boolean {
  if (status == null || status === "") return false;
  const v = status.toLowerCase();
  return v === "active" || v === "trial";
}

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
