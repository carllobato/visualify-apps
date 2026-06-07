import type { AppShellMobileBottomNavItem } from "@visualify/app-shell";
import { buildAppShellMobileBottomNavItems } from "@visualify/app-shell";
import { HqNavIcon } from "@/lib/hq-nav-icons";
import { appShellNavHrefActive } from "@visualify/app-shell";
import {
  HQ_MOBILE_BOTTOM_NAV_LINKS,
  HQ_ROUTES,
  hqWorkspacesPathActive,
} from "@/lib/hq-routes";

type BuildHqMobileBottomNavItemsOptions = {
  moreOnPress?: () => void;
  morePressed?: boolean;
};

export function buildHqMobileBottomNavItems(
  pathname: string,
  options: BuildHqMobileBottomNavItemsOptions = {},
): AppShellMobileBottomNavItem[] {
  const items = buildAppShellMobileBottomNavItems({
    pathname,
    links: HQ_MOBILE_BOTTOM_NAV_LINKS,
    renderIcon: (link) => <HqNavIcon href={link.href} />,
    more: {
      onPress: options.moreOnPress,
      pressed: options.morePressed,
    },
  });

  return items.map((item) => {
    if (item.kind !== "link") {
      return item;
    }
    if (item.href === HQ_ROUTES.workspaceSettings) {
      return { ...item, active: hqWorkspacesPathActive(pathname) };
    }
    return { ...item, active: appShellNavHrefActive(pathname, item.href) };
  });
}

