import { AppShellPageHeader } from "@visualify/app-shell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { isVisualifyStaffEmail } from "@/lib/auth/visualifyStaff";
import { fetchPendingWorkspaceInvitations } from "@/lib/workspace-invitations";
import {
  fetchManageableWorkspaceByRouteParam,
  fetchWorkspaceMemberCount,
  fetchWorkspaceMembersForAdmin,
  fetchWorkspaceWebsiteUrl,
} from "@/lib/workspace-settings-data";
import { isWorkspaceCreateType, type WorkspaceCreateType } from "@/types/workspace-create";
import {
  type AttachedWorkspaceProduct,
  fetchAttachedWorkspaceProducts,
  partitionWorkspaceProductsForAppsPage,
} from "@/lib/workspace-apps-data";
import { ActiveWorkspaceCookieSync } from "./active-workspace-cookie-sync";
import { WorkspacePageHeader } from "./workspace-page-header";
import { parseWorkspaceOverviewTab } from "@/lib/workspace-overview-tab";
import { WorkspaceOverviewTabs } from "./workspace-overview-tabs";

export const dynamic = "force-dynamic";

function dedupeAttachedProducts(rows: AttachedWorkspaceProduct[]): AttachedWorkspaceProduct[] {
  const seen = new Map<string, AttachedWorkspaceProduct>();
  for (const r of rows) {
    if (!seen.has(r.productKey)) seen.set(r.productKey, r);
  }
  return [...seen.values()].sort((a, b) => a.productName.localeCompare(b.productName));
}

function initialWorkspaceType(raw: string): WorkspaceCreateType {
  return isWorkspaceCreateType(raw) ? raw : "organisation";
}

function billingStatusSummary(attached: AttachedWorkspaceProduct[]): string {
  if (attached.length === 0) return "No products";
  const { active } = partitionWorkspaceProductsForAppsPage(attached);
  if (active.length > 0) return "Subscribed";
  return "No active subscription";
}

function noAccessMain(title: string, body: string) {
  return (
    <main className="w-full min-w-0 px-0 pb-4">
      <AppShellPageHeader title={title} description={body} className="mb-8" />
      <Link
        href="/account"
        className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
      >
        User Settings
      </Link>
    </main>
  );
}

export default async function HqWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await resolveAuthenticatedUser();
  if (!user) redirect("/login");

  const { workspaceId: routeWorkspaceId } = await params;
  const { tab: tabParam } = await searchParams;
  const initialTab = parseWorkspaceOverviewTab(tabParam) ?? "apps";
  const manageable = await fetchManageableWorkspaceByRouteParam(user.id, routeWorkspaceId);

  if (!manageable) {
    return noAccessMain(
      "Workspace",
      "This workspace is not available for administration. Choose another workspace from the rail.",
    );
  }

  const attached = await fetchAttachedWorkspaceProducts(manageable.id);
  const deduped = dedupeAttachedProducts(attached);
  const memberCount = await fetchWorkspaceMemberCount(manageable.id);
  const workspaceUsers = await fetchWorkspaceMembersForAdmin(manageable.id);
  const pendingWorkspaceInvitations = await fetchPendingWorkspaceInvitations(manageable.id);
  const { active } = partitionWorkspaceProductsForAppsPage(attached);
  const websiteUrl = (await fetchWorkspaceWebsiteUrl(manageable.id)) ?? "";

  return (
    <main className="w-full min-w-0 px-0 pb-4">
      <ActiveWorkspaceCookieSync workspaceId={manageable.id} />
      <WorkspacePageHeader workspaceName={manageable.name} websiteUrl={websiteUrl || null} />

      <WorkspaceOverviewTabs
        initialTab={initialTab}
        workspaceId={manageable.id}
        workspaceName={manageable.name}
        workspaceType={initialWorkspaceType(manageable.workspace_type)}
        websiteUrl={websiteUrl}
        activeAppsCount={active.length}
        memberCount={memberCount}
        billingStatusLabel={billingStatusSummary(attached)}
        attachedProducts={deduped}
        workspaceUsers={workspaceUsers}
        pendingWorkspaceInvitations={pendingWorkspaceInvitations}
        viewerMemberRole={manageable.memberRole}
        viewerIsVisualifyStaff={isVisualifyStaffEmail(user.email)}
      />
    </main>
  );
}
