import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { isVisualifyStaffEmail } from "@/lib/auth/visualifyStaff";
import { fetchPendingWorkspaceInvitations } from "@/lib/workspace-invitations";
import {
  fetchManageableWorkspaceByRouteParam,
  fetchWorkspaceMemberCount,
  fetchWorkspaceMembersForAdmin,
} from "@/lib/workspace-settings-data";
import {
  type AttachedWorkspaceProduct,
  fetchAttachedWorkspaceProducts,
  partitionWorkspaceProductsForAppsPage,
} from "@/lib/workspace-apps-data";
import { ActiveWorkspaceCookieSync } from "./active-workspace-cookie-sync";
import { WorkspaceOverviewTabs } from "./workspace-overview-tabs";

export const dynamic = "force-dynamic";

function dedupeAttachedProducts(rows: AttachedWorkspaceProduct[]): AttachedWorkspaceProduct[] {
  const seen = new Map<string, AttachedWorkspaceProduct>();
  for (const r of rows) {
    if (!seen.has(r.productKey)) seen.set(r.productKey, r);
  }
  return [...seen.values()].sort((a, b) => a.productName.localeCompare(b.productName));
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
      <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">{title}</h1>
      <p className="mb-8 text-sm text-[var(--ds-text-secondary)]">{body}</p>
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
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const user = await resolveAuthenticatedUser();
  if (!user) redirect("/login");

  const { workspaceId: routeWorkspaceId } = await params;
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

  return (
    <main className="w-full min-w-0 px-0 pb-4">
      <ActiveWorkspaceCookieSync workspaceId={manageable.id} />
      <h1 className="mb-2 text-2xl font-semibold text-[var(--ds-text-primary)]">
        {manageable.name} Workspace
      </h1>
      <p className="mb-8 text-sm text-[var(--ds-text-secondary)]">
        Admin hub for this workspace. Use the tabs below for apps, workspace users, billing, and settings.
      </p>

      <WorkspaceOverviewTabs
        workspaceId={manageable.id}
        activeAppsCount={active.length}
        memberCount={memberCount}
        billingStatusLabel={billingStatusSummary(attached)}
        attachedProducts={deduped}
        workspaceUsers={workspaceUsers}
        pendingWorkspaceInvitations={pendingWorkspaceInvitations}
        viewerIsVisualifyStaff={isVisualifyStaffEmail(user.email)}
      />
    </main>
  );
}
