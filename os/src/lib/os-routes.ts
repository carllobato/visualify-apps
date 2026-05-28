/** Primary OS navigation routes (authenticated). */
export const OS_ROUTES = {
  today: "/today",
  inbox: "/inbox",
  streams: "/streams",
  projects: "/projects",
  waitingOns: "/waiting-ons",
  decisions: "/decisions",
  briefings: "/briefings",
  settings: "/settings",
  account: "/account",
} as const;

export const OS_DEFAULT_ROUTE = OS_ROUTES.today;

export function osStreamDetailPath(streamId: string): string {
  return `${OS_ROUTES.streams}/${encodeURIComponent(streamId.trim())}`;
}

export function osProjectDetailPath(projectId: string): string {
  return `${OS_ROUTES.projects}/${encodeURIComponent(projectId.trim())}`;
}

export type OsRoutePath = (typeof OS_ROUTES)[keyof typeof OS_ROUTES];

export const OS_PRIMARY_NAV: readonly {
  href: OsRoutePath;
  label: string;
}[] = [
  { href: OS_ROUTES.today, label: "Today" },
  { href: OS_ROUTES.inbox, label: "Inbox" },
  { href: OS_ROUTES.streams, label: "Streams" },
  { href: OS_ROUTES.projects, label: "Projects" },
  { href: OS_ROUTES.waitingOns, label: "Waiting Ons" },
  { href: OS_ROUTES.decisions, label: "Decisions" },
  { href: OS_ROUTES.briefings, label: "Briefings" },
  { href: OS_ROUTES.settings, label: "Settings" },
];
