"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Tab,
  Tabs,
  dsNativeSelectFieldClassName,
} from "@visualify/design-system";
import {
  canInviteToWorkspace,
  canManageWorkspaceInHq,
  canViewWorkspaceBillingInHq,
  canViewWorkspaceSettingsInHq,
  defaultWorkspaceInviteRole,
  getAssignableWorkspaceInviteRoles,
} from "@/lib/workspace-member-roles";
import {
  type WorkspaceInviteRole,
  type WorkspacePendingInvitationRow,
  isWorkspaceInviteRole,
} from "@/types/workspace-invitations";
import {
  isActiveWorkspaceProductSubscription,
  resolveVisualifyAppLaunchHref,
} from "@/lib/visualify-apps";
import type { WorkspaceCreateType } from "@/types/workspace-create";
import type { WorkspaceOverviewTab } from "@/lib/workspace-overview-tab";
import { WorkspaceDetailsForm } from "./workspace-details-form";

export type WorkspaceOverviewProductRow = {
  productKey: string;
  productName: string;
  subscriptionStatus: string;
  plan: string | null;
};

export type WorkspaceOverviewUserRow = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

function workspaceUserDisplayName(row: WorkspaceOverviewUserRow): string {
  return row.displayName?.trim() || row.email?.trim() || "—";
}

function workspaceUserMetaLine(row: WorkspaceOverviewUserRow): string {
  const parts: string[] = [];
  if (row.displayName?.trim() && row.email?.trim()) {
    parts.push(row.email.trim());
  }
  parts.push(workspaceMembershipStatusLabel(row.status));
  return parts.join(" · ");
}

function workspaceRoleBadgeStatus(
  raw: string | null | undefined,
): "neutral" | "info" | "warning" {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "owner") return "warning";
  if (s === "admin") return "info";
  return "neutral";
}

function WorkspaceUsersInviteItem({ onInvite }: { onInvite: () => void }) {
  return (
    <li className="border-t border-dashed border-[var(--ds-border-subtle)]">
      <button
        type="button"
        onClick={onInvite}
        className="group flex w-full items-center gap-1.5 py-3 text-left text-[length:var(--ds-text-sm)] font-normal text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text-secondary)]"
      >
        <span
          className="text-[var(--ds-text-tertiary)] transition-colors group-hover:text-[var(--ds-text-secondary)]"
          aria-hidden
        >
          +
        </span>
        Invite user
      </button>
    </li>
  );
}

function workspaceRoleLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "owner" || s === "admin" || s === "member" || s === "viewer") {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const t = raw?.trim();
  return t && t.length > 0 ? t : "Member";
}

function workspaceMembershipStatusKey(raw: string | null | undefined): "active" | "invited" | "inactive" {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "active") return "active";
  if (s === "invited" || s === "pending" || s.includes("invit")) return "invited";
  if (s === "inactive" || s === "suspended" || s === "disabled") return "inactive";
  return "active";
}

function workspaceMembershipStatusLabel(raw: string | null | undefined): string {
  const key = workspaceMembershipStatusKey(raw);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function WorkspaceAppOpenControl({
  productKey,
  subscriptionStatus,
}: {
  productKey: string;
  subscriptionStatus: string;
}) {
  const launchHref = resolveVisualifyAppLaunchHref(productKey);
  const isActive = isActiveWorkspaceProductSubscription(subscriptionStatus);
  const canOpen = isActive && Boolean(launchHref);

  if (canOpen && launchHref) {
    return (
      <a
        href={launchHref}
        target="_blank"
        rel="noopener noreferrer"
        className="ds-outline-btn shrink-0 self-start no-underline sm:self-center"
      >
        Open app
      </a>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled
      className="shrink-0 self-start opacity-60 sm:self-center"
      aria-disabled
    >
      Open app
    </Button>
  );
}

const cardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";


const summaryCardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

const summaryCardInteractiveClass =
  summaryCardClass +
  " transition-colors group-hover:bg-[var(--ds-surface-hover)] group-active:bg-[var(--ds-surface-hover)]";

const summaryCardButtonClass =
  "group block w-full min-w-0 cursor-pointer rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 text-left " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2";

function WorkspaceOverviewSummaryCard({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className={summaryCardButtonClass} aria-label={`View ${label}`}>
      <Card variant="default" className={summaryCardInteractiveClass}>
        <CardContent className="!px-4 !py-3">
          <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-tertiary)]">
            {label}
          </p>
          <div className="mt-1 m-0 text-[var(--ds-text-primary)]">{value}</div>
        </CardContent>
      </Card>
    </button>
  );
}

function isHiddenTemplateAppEntitlementRow(row: WorkspaceOverviewProductRow): boolean {
  return (
    row.productKey.trim().toLowerCase() === "template" ||
    row.productName.trim().toLowerCase() === "template app"
  );
}

export function WorkspaceOverviewTabs({
  workspaceId,
  workspaceName,
  workspaceType,
  websiteUrl,
  activeAppsCount,
  memberCount,
  billingStatusLabel,
  attachedProducts,
  workspaceUsers,
  pendingWorkspaceInvitations,
  viewerMemberRole,
  viewerIsVisualifyStaff,
  initialTab = "details",
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceCreateType;
  websiteUrl: string;
  activeAppsCount: number;
  memberCount: number;
  billingStatusLabel: string;
  attachedProducts: WorkspaceOverviewProductRow[];
  workspaceUsers: WorkspaceOverviewUserRow[];
  pendingWorkspaceInvitations: WorkspacePendingInvitationRow[];
  viewerMemberRole: string;
  viewerIsVisualifyStaff: boolean;
  initialTab?: WorkspaceOverviewTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceOverviewTab>(initialTab);
  const canManage = canManageWorkspaceInHq(viewerMemberRole);
  const canInvite = canInviteToWorkspace(viewerMemberRole);
  const canViewBilling = canViewWorkspaceBillingInHq(viewerMemberRole);
  const canViewSettings = canViewWorkspaceSettingsInHq(viewerMemberRole);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "billing" && !canViewBilling) {
      setActiveTab("details");
    } else if (activeTab === "settings" && !canViewSettings) {
      setActiveTab("details");
    }
  }, [activeTab, canViewBilling, canViewSettings]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceInviteRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveConfirmName, setArchiveConfirmName] = useState("");
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [cancelInvitationError, setCancelInvitationError] = useState<string | null>(null);

  const archiveNameMatches =
    archiveConfirmName.trim() === workspaceName.trim() && workspaceName.trim().length > 0;

  const visibleAttachedProducts = attachedProducts.filter(
    (row) => !isHiddenTemplateAppEntitlementRow(row) || viewerIsVisualifyStaff,
  );

  const assignableInviteRoles = useMemo(
    () => getAssignableWorkspaceInviteRoles(viewerMemberRole),
    [viewerMemberRole],
  );

  useEffect(() => {
    if (assignableInviteRoles.length === 0) return;
    if (!assignableInviteRoles.includes(inviteRole)) {
      setInviteRole(defaultWorkspaceInviteRole(viewerMemberRole));
    }
  }, [assignableInviteRoles, inviteRole, viewerMemberRole]);

  useEffect(() => {
    if (!inviteModalOpen) {
      setInviteError(null);
      setInviteSuccessMessage(null);
      setInviteSubmitting(false);
    }
  }, [inviteModalOpen]);

  useEffect(() => {
    if (!archiveModalOpen) {
      setArchiveConfirmName("");
      setArchiveError(null);
      setArchiveSubmitting(false);
    }
  }, [archiveModalOpen]);

  const openInviteModal = () => {
    setInviteEmail("");
    setInviteRole(defaultWorkspaceInviteRole(viewerMemberRole));
    setInviteError(null);
    setInviteSuccessMessage(null);
    setInviteModalOpen(true);
  };

  const submitWorkspaceInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccessMessage(null);
    setInviteSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      const apiMessage =
        typeof data?.message === "string" && data.message.trim() ? data.message.trim() : null;
      if (res.ok && data?.ok === true) {
        setInviteSuccessMessage(data.message ?? "Invitation created");
        setInviteEmail("");
        router.refresh();
        return;
      }
      setInviteError(
        apiMessage ??
          (typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Could not create invitation."),
      );
    } catch {
      setInviteError("Could not create invitation.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const cancelWorkspaceInvitation = async (invitationId: string) => {
    setCancelInvitationError(null);
    setCancellingInvitationId(invitationId);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data?.ok === true) {
        router.refresh();
        return;
      }
      setCancelInvitationError(
        typeof data?.message === "string" && data.message.trim()
          ? data.message
          : typeof data?.error === "string" && data.error.trim()
            ? data.error
            : "Could not cancel invitation.",
      );
    } catch {
      setCancelInvitationError("Could not cancel invitation.");
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const submitWorkspaceArchive = async (e: FormEvent) => {
    e.preventDefault();
    if (!archiveNameMatches) return;
    setArchiveError(null);
    setArchiveSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/archive`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirect?: string;
        message?: string;
        error?: string;
      };
      if (res.ok && data?.ok === true) {
        setArchiveModalOpen(false);
        router.push(typeof data.redirect === "string" && data.redirect ? data.redirect : "/dashboard");
        router.refresh();
        return;
      }
      setArchiveError(
        typeof data?.message === "string" && data.message.trim()
          ? data.message
          : typeof data?.error === "string" && data.error.trim()
            ? data.error
            : "Could not archive workspace.",
      );
    } catch {
      setArchiveError("Could not archive workspace.");
    } finally {
      setArchiveSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`mb-6 grid grid-cols-1 gap-3 ${canViewBilling ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        <WorkspaceOverviewSummaryCard
          label="Active Apps"
          value={
            <p className="m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums">{activeAppsCount}</p>
          }
          onSelect={() => setActiveTab("apps")}
        />
        <WorkspaceOverviewSummaryCard
          label="Workspace users"
          value={
            <p className="m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums">{memberCount}</p>
          }
          onSelect={() => setActiveTab("workspace_users")}
        />
        {canViewBilling ? (
          <WorkspaceOverviewSummaryCard
            label="Billing Status"
            value={
              <p className="m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums">{billingStatusLabel}</p>
            }
            onSelect={() => setActiveTab("billing")}
          />
        ) : null}
      </div>

      <div className="mb-4 border-b border-[var(--ds-border)]">
        <Tabs>
          <Tab active={activeTab === "details"} onClick={() => setActiveTab("details")}>
            Details
          </Tab>
          <Tab active={activeTab === "apps"} onClick={() => setActiveTab("apps")}>
            Apps
          </Tab>
          <Tab active={activeTab === "workspace_users"} onClick={() => setActiveTab("workspace_users")}>
            Workspace Users
          </Tab>
          {canViewBilling ? (
            <Tab active={activeTab === "billing"} onClick={() => setActiveTab("billing")}>
              Billing
            </Tab>
          ) : null}
          {canViewSettings ? (
            <Tab active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
              Settings
            </Tab>
          ) : null}
        </Tabs>
      </div>

      {activeTab === "details" ? (
        canManage ? (
          <Card variant="default" className={cardClass}>
            <CardHeader className="!px-4 !py-2.5">
              <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Details</h2>
            </CardHeader>
            <CardContent className="!px-4 !py-3">
              <WorkspaceDetailsForm
                key={`${workspaceName}-${workspaceType}-${websiteUrl}`}
                workspaceId={workspaceId}
                initialName={workspaceName}
                initialWorkspaceType={workspaceType}
                initialWebsiteUrl={websiteUrl}
              />
            </CardContent>
          </Card>
        ) : (
          <Card variant="default" className={cardClass}>
            <CardHeader className="!px-4 !py-2.5">
              <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Details</h2>
            </CardHeader>
            <CardContent className="!px-4 !py-3">
              <WorkspaceDetailsForm
                key={`${workspaceName}-${workspaceType}-${websiteUrl}-readonly`}
                workspaceId={workspaceId}
                initialName={workspaceName}
                initialWorkspaceType={workspaceType}
                initialWebsiteUrl={websiteUrl}
                readOnly
              />
            </CardContent>
          </Card>
        )
      ) : null}

      {activeTab === "apps" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Product entitlements</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            {visibleAttachedProducts.length === 0 ? (
              <p className="m-0 text-sm text-[var(--ds-text-secondary)]">
                No product entitlements are attached to this workspace yet.
              </p>
            ) : (
              <ul className="m-0 list-none space-y-0 divide-y divide-[var(--ds-border)] p-0">
                {visibleAttachedProducts.map((row) => (
                  <li key={row.productKey} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-medium text-[var(--ds-text-primary)]">{row.productName}</p>
                      <p className="mt-0.5 m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                        {row.subscriptionStatus || "—"}
                        {row.plan ? ` · ${row.plan}` : ""}
                      </p>
                    </div>
                    <WorkspaceAppOpenControl
                      productKey={row.productKey}
                      subscriptionStatus={row.subscriptionStatus}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "workspace_users" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Workspace Users</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            {workspaceUsers.length === 0 && !canInvite ? (
              <p className="m-0 text-sm text-[var(--ds-text-secondary)]">No workspace users yet.</p>
            ) : (
              <ul className="m-0 list-none space-y-0 divide-y divide-[var(--ds-border)] p-0">
                {workspaceUsers.map((row) => (
                  <li
                    key={row.userId}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="m-0 text-sm font-medium text-[var(--ds-text-primary)]">
                          {workspaceUserDisplayName(row)}
                        </p>
                        <Badge variant="subtle" status={workspaceRoleBadgeStatus(row.role)}>
                          {workspaceRoleLabel(row.role)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                        {workspaceUserMetaLine(row)}
                      </p>
                    </div>
                  </li>
                ))}
                {canInvite ? <WorkspaceUsersInviteItem onInvite={openInviteModal} /> : null}
              </ul>
            )}

            <div className="mt-8 border-t border-[var(--ds-border)] pt-6">
              <h3 className="m-0 mb-3 text-sm font-semibold text-[var(--ds-text-primary)]">Pending Invitations</h3>
              {cancelInvitationError ? (
                <p className="m-0 mb-3 text-sm text-[var(--ds-color-danger-fg,#b42318)]" role="alert">
                  {cancelInvitationError}
                </p>
              ) : null}
              {pendingWorkspaceInvitations.length === 0 ? (
                <p className="m-0 text-sm text-[var(--ds-text-secondary)]">No pending invitations.</p>
              ) : (
                <ul className="m-0 list-none space-y-0 divide-y divide-[var(--ds-border)] p-0">
                  {pendingWorkspaceInvitations.map((inv) => {
                    const created =
                      inv.createdAt && !Number.isNaN(Date.parse(inv.createdAt))
                        ? new Date(inv.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—";
                    const cancelling = cancellingInvitationId === inv.id;
                    const actionsDisabled = cancellingInvitationId !== null;
                    return (
                      <li
                        key={inv.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="m-0 text-sm font-medium text-[var(--ds-text-primary)]">
                            {inv.email || "—"}
                          </p>
                          <p className="mt-0.5 m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                            {[workspaceRoleLabel(inv.role), created, inv.status || "—"].join(" · ")}
                          </p>
                        </div>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={actionsDisabled}
                            className="shrink-0 self-start sm:self-center"
                            onClick={() => void cancelWorkspaceInvitation(inv.id)}
                          >
                            {cancelling ? "Cancelling…" : "Cancel"}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {inviteModalOpen && canInvite ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          role="presentation"
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-invite-modal-title"
            className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-5 shadow-[var(--ds-shadow-md)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="workspace-invite-modal-title"
              className="m-0 text-base font-semibold text-[var(--ds-text-primary)]"
            >
              Invite user
            </h3>
            <p className="mt-1 mb-4 text-sm text-[var(--ds-text-secondary)]">
              Creates a pending workspace invitation (database only; acceptance and email are not enabled yet).
            </p>
            <form className="space-y-4" onSubmit={(e) => void submitWorkspaceInvite(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-invite-email">Email</Label>
                <Input
                  id="workspace-invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-invite-role">Role</Label>
                <select
                  id="workspace-invite-role"
                  className={dsNativeSelectFieldClassName(false)}
                  value={inviteRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isWorkspaceInviteRole(v)) setInviteRole(v);
                  }}
                  disabled={inviteSubmitting}
                >
                  {assignableInviteRoles.map((role) => (
                    <option key={role} value={role}>
                      {workspaceRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              {inviteError ? (
                <p className="m-0 text-sm text-[var(--ds-color-danger-fg,#b42318)]" role="alert">
                  {inviteError}
                </p>
              ) : null}
              {inviteSuccessMessage ? (
                <p className="m-0 text-sm text-[var(--ds-text-secondary)]" role="status">
                  {inviteSuccessMessage}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={inviteSubmitting}
                  onClick={() => setInviteModalOpen(false)}
                >
                  Close
                </Button>
                <Button type="submit" disabled={inviteSubmitting}>
                  {inviteSubmitting ? "Creating…" : "Create invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === "billing" && canViewBilling ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Billing</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="m-0 text-sm text-[var(--ds-text-secondary)]">Free version</p>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "settings" && canViewSettings ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Settings</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="mb-6 text-sm text-[var(--ds-text-secondary)]">
              Workspace preferences and controls will appear here as they are added.
            </p>
            <div className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-color-danger-fg,#b42318)]/35 bg-[var(--ds-surface-default)] p-4">
              <h3 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Danger zone</h3>
              <p className="mt-2 mb-4 text-sm text-[var(--ds-text-secondary)]">
                This removes the workspace from normal use but keeps it recoverable by Visualify support.
              </p>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="border-[var(--ds-color-danger-fg,#b42318)]/50 text-[var(--ds-color-danger-fg,#b42318)] hover:bg-[var(--ds-surface-hover)]"
                  onClick={() => setArchiveModalOpen(true)}
                >
                  Archive workspace
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled
                  className="border-[var(--ds-color-danger-fg,#b42318)]/50 text-[var(--ds-color-danger-fg,#b42318)] opacity-60"
                  aria-disabled
                >
                  Archive workspace
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {archiveModalOpen ? (
        <WorkspaceArchiveModal
          workspaceName={workspaceName}
          archiveConfirmName={archiveConfirmName}
          archiveNameMatches={archiveNameMatches}
          archiveError={archiveError}
          archiveSubmitting={archiveSubmitting}
          onClose={() => setArchiveModalOpen(false)}
          onConfirmNameChange={setArchiveConfirmName}
          onSubmit={(e) => void submitWorkspaceArchive(e)}
        />
      ) : null}
    </>
  );
}

function WorkspaceArchiveModal({
  workspaceName,
  archiveConfirmName,
  archiveNameMatches,
  archiveError,
  archiveSubmitting,
  onClose,
  onConfirmNameChange,
  onSubmit,
}: {
  workspaceName: string;
  archiveConfirmName: string;
  archiveNameMatches: boolean;
  archiveError: string | null;
  archiveSubmitting: boolean;
  onClose: () => void;
  onConfirmNameChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-archive-modal-title"
        className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-5 shadow-[var(--ds-shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="workspace-archive-modal-title"
          className="m-0 text-base font-semibold text-[var(--ds-text-primary)]"
        >
          Archive workspace
        </h3>
        <p className="mt-1 mb-4 text-sm text-[var(--ds-text-secondary)]">
          This removes the workspace from normal use but keeps it recoverable by Visualify support.
          Memberships and product data are not deleted.
        </p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="workspace-archive-confirm-name">
              Type <span className="font-medium text-[var(--ds-text-primary)]">{workspaceName}</span> to confirm
            </Label>
            <Input
              id="workspace-archive-confirm-name"
              type="text"
              autoComplete="off"
              value={archiveConfirmName}
              onChange={(e) => onConfirmNameChange(e.target.value)}
              required
              disabled={archiveSubmitting}
            />
          </div>
          {archiveError ? (
            <p className="m-0 text-sm text-[var(--ds-color-danger-fg,#b42318)]" role="alert">
              {archiveError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" disabled={archiveSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={archiveSubmitting || !archiveNameMatches}>
              {archiveSubmitting ? "Archiving…" : "Archive workspace"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
