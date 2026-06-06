import {
  getHqAppsUrl,
  getProductDashboardUrl,
  getProductOrigin,
  readPublicEnv,
} from "@visualify/urls";
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

/** Template App on the shared RiskAI app host (staff-only catalog entry). */
function resolveTemplateAppLaunchUrl(): string {
  return `${getProductOrigin("riskai")}/template-app`;
}

function resolveReportDashboardUrl(): string | undefined {
  const origin = readPublicEnv("NEXT_PUBLIC_REPORT_ORIGIN")?.replace(/\/$/, "");
  return origin ? `${origin}/projects` : undefined;
}

/**
 * Platform catalog for Account → Apps and HQ app surfaces. Catalog `id` matches `visualify_products.key`
 * for workspace entitlement checks.
 */
export const VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG: readonly AccountSettingsAppCatalogEntry[] = [
  {
    id: "hq",
    name: "Visualify HQ",
    description: "App launcher, workspaces, and account.",
    href: getHqAppsUrl(),
  },
  {
    id: "os",
    name: "OS",
    description: "Personal operating system — calm, operational, high-signal.",
    href: getProductDashboardUrl("os"),
  },
  {
    id: "controlai",
    name: "ControlAI",
    description: "Control and governance for your programmes.",
    href: getProductDashboardUrl("controlai"),
  },
  {
    id: "riskai",
    name: "RiskAI",
    description: "Risk management, simulations and reporting.",
    href: resolveRiskAiDashboardUrl(),
  },
  {
    id: "report",
    name: "Report",
    description: "Reporting, dashboards and portfolio visibility.",
    href: resolveReportDashboardUrl(),
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
  {
    id: "website",
    name: "Website",
    description: "Visualify marketing site and public presence.",
    href: getProductDashboardUrl("website"),
  },
];

/** Internal scaffold — shown only for `@visualify.com.au` staff in account and app switcher surfaces. */
export const VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG: readonly AccountSettingsAppCatalogEntry[] = [
  {
    id: "template-app",
    name: "Template App",
    description: "Internal product scaffold and integration reference for Visualify staff.",
    href: resolveTemplateAppLaunchUrl(),
  },
];
