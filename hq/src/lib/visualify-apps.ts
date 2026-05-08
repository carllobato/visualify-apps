/** RiskAI entry point (same as dashboard). */
export const RISKAI_DASHBOARD_URL = "https://app.visualify.com.au/riskai/dashboard";

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
  /**
   * Placeholder row so Account → Apps can show both columns before more products ship.
   * Remove when the catalog is driven by entitlements only.
   */
  {
    id: "more-apps",
    name: "More Visualify apps",
    description: "Other products will appear here as they launch and as your access is assigned.",
  },
];
