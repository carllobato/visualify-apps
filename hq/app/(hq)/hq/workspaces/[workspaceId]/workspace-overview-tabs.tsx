"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
} from "@visualify/design-system";
import type { WorkspacePendingInvitationRow } from "@/types/workspace-invitations";
import { RISKAI_DASHBOARD_URL } from "@/lib/visualify-apps";
import type { WorkspaceCreateType } from "@/types/workspace-create";
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

type WorkspaceOverviewTab = "details" | "apps" | "workspace_users" | "billing" | "settings";

type RoleBadgeKey = "owner" | "admin" | "member" | "other";
type StatusBadgeKey = "active" | "invited" | "inactive";

function workspaceRoleBadgeKey(raw: string | null | undefined): RoleBadgeKey {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "owner" || s === "admin" || s === "member") return s;
  return "other";
}

function workspaceRoleLabel(raw: string | null | undefined): string {
  const key = workspaceRoleBadgeKey(raw);
  if (key !== "other") return key;
  const t = raw?.trim();
  return t && t.length > 0 ? t : "member";
}

function workspaceMembershipStatusKey(raw: string | null | undefined): StatusBadgeKey {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "active") return "active";
  if (s === "invited" || s === "pending" || s.includes("invit")) return "invited";
  if (s === "inactive" || s === "suspended" || s === "disabled") return "inactive";
  return "active";
}

function workspaceMembershipStatusLabel(raw: string | null | undefined): string {
  return workspaceMembershipStatusKey(raw);
}

function roleBadgeStatus(key: RoleBadgeKey): "neutral" | "info" | "warning" {
  if (key === "owner") return "warning";
  if (key === "admin") return "info";
  return "neutral";
}

function statusBadgeStatus(key: StatusBadgeKey): "success" | "warning" | "neutral" {
  if (key === "active") return "success";
  if (key === "invited") return "warning";
  return "neutral";
}

function WorkspaceUsersInviteRow({ onInvite }: { onInvite: () => void }) {
  return (
    <tr className="border-t border-dashed border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-text-primary)_2%,var(--ds-surface-default))]">
      <td colSpan={4} className="p-0">
        <button
          type="button"
          onClick={onInvite}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)]"
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] border border-dashed border-[var(--ds-border)] text-[var(--ds-text-tertiary)]"
            aria-hidden
          >
            +
          </span>
          Invite user
        </button>
      </td>
    </tr>
  );
}

const cardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

const summaryCardClass =
  "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

const secondaryLinkClass =
  "inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]";

function isRiskAiProductKey(key: string): boolean {
  return key.trim().toLowerCase() === "riskai";
}

/** Internal-only product; omit from workspace entitlement list for non-staff HQ viewers. */
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
  viewerIsVisualifyStaff,
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
  viewerIsVisualifyStaff: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceOverviewTab>("details");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
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
    setInviteRole("member");
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
      if (res.ok && data?.ok === true) {
        setInviteSuccessMessage(data.message ?? "Invitation created");
        setInviteEmail("");
        router.refresh();
        return;
      }
      setInviteError(
        typeof data?.message === "string" && data.message.trim()
          ? data.message
          : typeof data?.error === "string" && data.error.trim()
            ? data.error
            : "Could not create invitation.",
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
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card variant="default" className={summaryCardClass}>
          <CardContent className="!px-4 !py-3">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-tertiary)]">
              Active Apps
            </p>
            <p className="mt-1 m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {activeAppsCount}
            </p>
          </CardContent>
        </Card>
        <Card variant="default" className={summaryCardClass}>
          <CardContent className="!px-4 !py-3">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-tertiary)]">
              Workspace users
            </p>
            <p className="mt-1 m-0 text-[length:var(--ds-text-lg)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
              {memberCount}
            </p>
          </CardContent>
        </Card>
        <Card variant="default" className={summaryCardClass}>
          <CardContent className="!px-4 !py-3">
            <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-tertiary)]">
              Billing Status
            </p>
            <p className="mt-1 m-0 text-[length:var(--ds-text-sm)] font-semibold leading-snug text-[var(--ds-text-primary)]">
              {billingStatusLabel}
            </p>
          </CardContent>
        </Card>
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
          <Tab active={activeTab === "billing"} onClick={() => setActiveTab("billing")}>
            Billing
          </Tab>
          <Tab active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
            Settings
          </Tab>
        </Tabs>
      </div>

      {activeTab === "details" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Details</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
              Update the workspace name, type, and website from initial setup.
            </p>
            <WorkspaceDetailsForm
              key={`${workspaceName}-${workspaceType}-${websiteUrl}`}
              workspaceId={workspaceId}
              initialName={workspaceName}
              initialWorkspaceType={workspaceType}
              initialWebsiteUrl={websiteUrl}
            />
          </CardContent>
        </Card>
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
                    {isRiskAiProductKey(row.productKey) ? (
                      <a
                        href={RISKAI_DASHBOARD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={secondaryLinkClass + " shrink-0 self-start sm:self-center"}
                      >
                        Open RiskAI
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "workspace_users" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="flex flex-col gap-3 !px-4 !py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Workspace Users</h2>
            <Button type="button" size="sm" variant="secondary" onClick={openInviteModal}>
              Invite User
            </Button>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <div className="overflow-x-auto rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--ds-border)] bg-[var(--ds-surface-default)]">
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Name</th>
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Email</th>
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Role</th>
                      <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceUsers.length === 0 ? (
                      <tr className="border-b border-[var(--ds-border)]">
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-sm text-[var(--ds-text-secondary)]"
                        >
                          No workspace users yet.
                        </td>
                      </tr>
                    ) : (
                      workspaceUsers.map((row) => {
                        const rk = workspaceRoleBadgeKey(row.role);
                        const sk = workspaceMembershipStatusKey(row.status);
                        return (
                          <tr key={row.userId} className="border-b border-[var(--ds-border)]">
                            <td className="px-3 py-2.5 font-medium text-[var(--ds-text-primary)]">
                              {row.displayName?.trim() || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-[var(--ds-text-secondary)]">{row.email?.trim() || "—"}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant="subtle" status={roleBadgeStatus(rk)}>
                                {workspaceRoleLabel(row.role)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant="subtle" status={statusBadgeStatus(sk)}>
                                {workspaceMembershipStatusLabel(row.status)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    <WorkspaceUsersInviteRow onInvite={openInviteModal} />
                  </tbody>
                </table>
              </div>

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
                <div className="overflow-x-auto rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)]">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--ds-border)] bg-[var(--ds-surface-default)]">
                        <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Email</th>
                        <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Role</th>
                        <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Created</th>
                        <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">Status</th>
                        <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
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
                          <tr key={inv.id} className="border-b border-[var(--ds-border)] last:border-b-0">
                            <td className="px-3 py-2.5 text-[var(--ds-text-primary)]">{inv.email || "—"}</td>
                            <td className="px-3 py-2.5 text-[var(--ds-text-secondary)]">{inv.role || "—"}</td>
                            <td className="px-3 py-2.5 text-[var(--ds-text-secondary)]">{created}</td>
                            <td className="px-3 py-2.5 text-[var(--ds-text-secondary)]">{inv.status || "—"}</td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={actionsDisabled}
                                onClick={() => void cancelWorkspaceInvitation(inv.id)}
                              >
                                {cancelling ? "Cancelling…" : "Cancel"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {inviteModalOpen ? (
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
                  className="w-full rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm text-[var(--ds-text-primary)]"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value === "admin" ? "admin" : "member")}
                  disabled={inviteSubmitting}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
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

      {activeTab === "billing" ? (
        <Card variant="default" className={cardClass}>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Billing</h2>
          </CardHeader>
          <CardContent className="!px-4 !py-3">
            <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
              Review subscriptions, payment method, and invoices for this workspace.
            </p>
            <Link href="/billing" className={secondaryLinkClass}>
              Go to Billing
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "settings" ? (
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-[var(--ds-color-danger-fg,#b42318)]/50 text-[var(--ds-color-danger-fg,#b42318)] hover:bg-[var(--ds-surface-hover)]"
                onClick={() => setArchiveModalOpen(true)}
              >
                Archive workspace
              </Button>
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
