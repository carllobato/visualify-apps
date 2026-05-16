/** RiskAI entry point (same as dashboard). */
export const RISKAI_DASHBOARD_URL = "https://app.visualify.com.au/riskai/dashboard";

/** Host for app routes shared with RiskAI (legal pages, etc.). */
export const VISUALIFY_APP_ORIGIN = new URL(RISKAI_DASHBOARD_URL).origin;

/** Template App on the shared app host (HQ dashboard tile for Visualify staff only). */
export const TEMPLATE_APP_HQ_LAUNCH_URL = `${VISUALIFY_APP_ORIGIN}/template-app`;

export type VisualifyAppDefinition = {
  id: string;
  name: string;
  description: string;
  /** When set, “Open” may link here for apps the user can access. */
  href?: string;
};

/**
 * Default HQ app catalog tiles. Catalog `id` matches `visualify_products.key` for workspace entitlement checks.
 * Account → Apps splits this list using workspace-derived product keys (membership + workspace subscriptions).
 */
export const VISUALIFY_APP_CATALOG: VisualifyAppDefinition[] = [
  {
    id: "riskai",
    name: "RiskAI",
    description: "Risk management, simulations and reporting.",
    href: RISKAI_DASHBOARD_URL,
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

/** App launcher tile for HQ dashboard — append only when `isVisualifyStaffEmail` is true. */
export const VISUALIFY_STAFF_TEMPLATE_APP_DASHBOARD_TILE: VisualifyAppDefinition = {
  id: "template",
  name: "Template App",
  description: "Internal product scaffold and integration reference for Visualify staff.",
  href: TEMPLATE_APP_HQ_LAUNCH_URL,
};
