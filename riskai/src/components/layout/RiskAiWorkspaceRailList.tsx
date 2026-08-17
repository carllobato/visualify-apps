"use client";

import Link from "next/link";
import {
  AppShellEntityAvatar,
  appShellRailIconWellClassName,
  appShellRailNavRowClass,
  railBrandTitleClass,
  useAppShellRailMobileNav,
} from "@visualify/app-shell";
import { workspaceAvatarImageUrls } from "@/lib/workspace/workspaceFavicon";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

/** Workspace name — larger type than project rows; matches rail brand title weight. */
const RAIL_WORKSPACE_LABEL_CLASS =
  `vf-app-shell-rail-expand-label min-w-0 shrink truncate text-left ${railBrandTitleClass} ` +
  "w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-[400ms] ease-out " +
  "group-data-[pinned=true]:w-auto group-data-[pinned=true]:flex-1 group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:opacity-100 " +
  "max-md:group-data-[mobile-open=true]:w-auto max-md:group-data-[mobile-open=true]:flex-1 max-md:group-data-[mobile-open=true]:max-w-[11rem] max-md:group-data-[mobile-open=true]:opacity-100";

const RAIL_WORKSPACE_HOME_LINK_CLASS = (active: boolean) =>
  appShellRailNavRowClass(active) + " min-w-0 flex-1 no-underline";

/** Same layers mark as Portfolio Overview in the product sidebar. */
function IconPortfolio({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.05 4.32a2 2 0 0 1-1.9 0L2 17.65" />
      <path d="m2 12 9.05 4.32a2 2 0 0 0 1.9 0L22 12" />
    </svg>
  );
}

function WorkspaceRailAvatar({ workspace }: { workspace: EntitledWorkspace }) {
  return (
    <AppShellEntityAvatar
      size="rail"
      imageUrls={workspaceAvatarImageUrls(workspace.website_url, workspace.logo_url)}
      fallback={<IconPortfolio size={20} />}
    />
  );
}

/**
 * Active Workspace identity in the App Shell rail.
 * Links to Workspace Overview; switching workspaces is via the RiskAI brand → `/home`.
 */
export function RiskAiWorkspaceRailList({
  workspace,
  overviewHref,
  active,
}: {
  workspace: EntitledWorkspace;
  overviewHref: string;
  active: boolean;
}) {
  const { closeMobile } = useAppShellRailMobileNav();

  return (
    <Link
      href={overviewHref}
      className={RAIL_WORKSPACE_HOME_LINK_CLASS(active)}
      aria-label={`${workspace.name}, workspace overview`}
      aria-current={active ? "page" : undefined}
      title={workspace.name}
      onClick={() => closeMobile()}
    >
      <span className={appShellRailIconWellClassName}>
        <WorkspaceRailAvatar workspace={workspace} />
      </span>
      <span className={RAIL_WORKSPACE_LABEL_CLASS}>{workspace.name}</span>
    </Link>
  );
}
