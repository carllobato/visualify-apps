import type { AppShellMobileBottomNavItem } from "@visualify/app-shell";
import { appShellNavHrefActive } from "@visualify/app-shell";
import { OsNavIcon } from "@/lib/os-nav-icons";
import { OS_ROUTES } from "@/lib/os-routes";

/** Primary destinations on the mobile bottom bar (drawer holds the full {@link OS_PRIMARY_NAV}). */
export const OS_MOBILE_BOTTOM_NAV_LINKS = [
  { href: OS_ROUTES.today, label: "Today" },
  { href: OS_ROUTES.inbox, label: "Inbox" },
  { href: OS_ROUTES.streams, label: "Streams" },
] as const;

export function buildOsMobileBottomNavItems(pathname: string): AppShellMobileBottomNavItem[] {
  const links: AppShellMobileBottomNavItem[] = OS_MOBILE_BOTTOM_NAV_LINKS.map(({ href, label }) => ({
    kind: "link",
    href,
    label,
    icon: <OsNavIcon href={href} />,
    active: appShellNavHrefActive(pathname, href),
  }));

  links.push({ kind: "more" });

  return links;
}
