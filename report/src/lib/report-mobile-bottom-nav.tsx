import type { AppShellMobileBottomNavItem } from "@visualify/app-shell";
import { buildAppShellMobileBottomNavItems } from "@visualify/app-shell";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import { ReportNavIcon } from "@/lib/report-nav-icons";
import {
  isReportProjectsListPath,
  isReportReportViewPath,
  REPORT_ROUTES,
  reportReportsNavHref,
} from "@/lib/report-routes";

type BuildReportMobileBottomNavItemsOptions = {
  moreOnPress?: () => void;
  morePressed?: boolean;
};

export function buildReportMobileBottomNavItems(
  pathname: string,
  projects: readonly ReportProjectListItem[],
  lastUsedProjectId: string | null = null,
  options: BuildReportMobileBottomNavItemsOptions = {},
): AppShellMobileBottomNavItem[] {
  const links = [
    { href: REPORT_ROUTES.projects, label: "Projects" },
    {
      href: reportReportsNavHref(pathname, projects, lastUsedProjectId),
      label: "Reports",
    },
  ] as const;

  const items = buildAppShellMobileBottomNavItems({
    pathname,
    links,
    renderIcon: (link) => <ReportNavIcon href={link.href} label={link.label} />,
    more: {
      onPress: options.moreOnPress,
      pressed: options.morePressed,
    },
  });

  return items.map((item) => {
    if (item.kind !== "link") {
      return item;
    }
    if (item.label === "Projects") {
      return { ...item, active: isReportProjectsListPath(pathname) };
    }
    if (item.label === "Reports") {
      return { ...item, active: isReportReportViewPath(pathname) };
    }
    return item;
  });
}
