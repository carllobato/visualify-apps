import { getProductDashboardUrl, readPublicEnv } from "@visualify/urls";
import type { AppShellRailAppCatalogEntry } from "../AppShellRailBrandAppMenu";

/** Product catalog entry for Account → Apps (matches `visualify_products.key`). */
export type AccountSettingsAppCatalogEntry = AppShellRailAppCatalogEntry;

/**
 * @deprecated Legacy override for Account → Apps RiskAI link. Prefer `NEXT_PUBLIC_RISKAI_ORIGIN`
 * (dashboard URL is `{origin}/dashboard` via {@link getProductDashboardUrl}). Scheduled for removal
 * after env migration; still honoured when set.
 */
function resolveRiskAiDashboardUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_RISKAI_DASHBOARD_URL") ?? getProductDashboardUrl("riskai");
}

/**
 * Platform catalog for Account → Apps. Catalog `id` matches `visualify_products.key` for workspace entitlement checks.
 */
export const VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG: readonly AccountSettingsAppCatalogEntry[] = [
  {
    id: "riskai",
    name: "RiskAI",
    description: "Risk management, simulations and reporting.",
    href: resolveRiskAiDashboardUrl(),
  },
  {
    id: "reportai",
    name: "ReportAI",
    description: "Reporting, dashboards and portfolio visibility.",
  },
  {
    id: "costai",
    name: "CostAI",
    description: "Cost modelling, scenarios and financial intelligence.",
  },
  {
    id: "scheduleai",
    name: "ScheduleAI",
    description: "Planning, milestones and schedule intelligence.",
  },
];
