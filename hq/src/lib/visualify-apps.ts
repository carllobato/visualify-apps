/** RiskAI entry point (same as dashboard). */
export const RISKAI_DASHBOARD_URL = "https://app.visualify.com.au/riskai/dashboard";

/** Host for app routes shared with RiskAI (legal pages, etc.). */
export const VISUALIFY_APP_ORIGIN = new URL(RISKAI_DASHBOARD_URL).origin;

export type VisualifyAppDefinition = {
  id: string;
  name: string;
  description: string;
  /** When set, “Open” may link here for apps the user can access. */
  href?: string;
};

/**
 * Apps listed under Account → Apps. Split into granted vs not granted using `grantedAppIds`.
 * Replace or augment with API-driven data when app entitlements exist.
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
