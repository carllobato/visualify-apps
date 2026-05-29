/** Default signed-in landing route for ControlAI. */
export const CONTROLAI_DEFAULT_ROUTE = "/dashboard";

export const CONTROLAI_ROUTES = {
  dashboard: "/dashboard",
  portfolios: "/portfolios",
  projects: "/projects",
  settings: "/settings",
  account: "/account",
  selectWorkspace: "/select-workspace",
} as const;

export const CONTROLAI_PRIMARY_NAV = [
  { href: CONTROLAI_ROUTES.dashboard, label: "Dashboard" },
  { href: CONTROLAI_ROUTES.portfolios, label: "Portfolios" },
  { href: CONTROLAI_ROUTES.projects, label: "Projects" },
  { href: CONTROLAI_ROUTES.settings, label: "Settings" },
] as const;
