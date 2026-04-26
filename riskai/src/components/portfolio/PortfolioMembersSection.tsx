"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { canonicalUserId, coerceProfileFromUnknown } from "@/lib/profileDisplayCoerce";
import type { ProfileDisplayRow } from "@/types/projectMembers";
import type {
  PortfolioMemberRole,
  PortfolioMemberWithProfileRow,
} from "@/types/portfolioMembers";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  FieldError,
  HelperText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";
import { LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";
import { ProjectMemberPermissionHints } from "@/components/project/ProjectMemberPermissionHints";
import {
  ADD_MEMBER_ROLE_PLACEHOLDER_LABEL,
  ADD_MEMBER_ROLE_VALIDATION_ERROR,
  MEMBERS_ACTIONS_COLUMN_WIDTH,
  MEMBERS_NAME_COLUMN_WIDTH,
  MEMBERS_ROLE_COLUMN_WIDTH,
  membersActionsSlotInnerClass,
  membersActionsSlotOuterClass,
  membersTableCurrentUserRowClass,
  projectSettingsInputClass,
  projectSettingsSelectClass,
} from "@/components/project/projectSettingsDsFormClasses";

type Viewer = {
  currentUserId: string;
  canManageMembers: boolean;
  memberRole: PortfolioMemberRole | null;
  canEditPortfolioDetails: boolean;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
};

type MembersResponse = {
  members: PortfolioMemberWithProfileRow[];
  profiles: Record<string, ProfileDisplayRow>;
  viewer: Viewer;
  roleSemantics?: Record<PortfolioMemberRole, string>;
};

function resolveProfile(
  m: PortfolioMemberWithProfileRow,
  profilesMap: Record<string, ProfileDisplayRow>
): ProfileDisplayRow | undefined {
  const fromNested =
    coerceProfileFromUnknown(m.profiles) ?? coerceProfileFromUnknown(m.profile);
  if (fromNested) return fromNested;
  return profilesMap[canonicalUserId(m.user_id)] ?? profilesMap[m.user_id];
}

function normalizeResolvedProfile(
  m: PortfolioMemberWithProfileRow,
  profilesMap: Record<string, ProfileDisplayRow>
): ProfileDisplayRow | undefined {
  const fromResolved = coerceProfileFromUnknown(m.resolvedProfile);
  if (fromResolved) return fromResolved;
  return resolveProfile(m, profilesMap);
}

/** 1) first + surname 2) server `member.email` 3) profile email 4) company 5) invited placeholder */
function computeDisplayName(
  profile: ProfileDisplayRow | undefined,
  topLevelEmail: string | null | undefined,
  _userId: string
): string {
  const fullName = [profile?.first_name, profile?.surname].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  const te = topLevelEmail?.trim();
  if (te) return te;
  const pe = profile?.email?.trim();
  if (pe) return pe;
  const co = profile?.company?.trim();
  if (co) return co;
  return "Invited user";
}

/** Prefer API-merged `member.email` (includes auth.users fallback) over nested profile only. */
function computeDisplayEmail(
  profile: ProfileDisplayRow | undefined,
  topLevelEmail: string | null | undefined
): string {
  const te = topLevelEmail?.trim();
  if (te) return te;
  const pe = profile?.email?.trim();
  if (pe) return pe;
  return "—";
}

const ROLE_OPTIONS: { value: PortfolioMemberRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

function isStandardPortfolioRole(role: string): role is PortfolioMemberRole {
  return (ROLE_OPTIONS as { value: string }[]).some((o) => o.value === role);
}

export function PortfolioMembersSection({ portfolioId }: { portfolioId: string }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PortfolioMemberWithProfileRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileDisplayRow>>({});
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [roleSemantics, setRoleSemantics] = useState<Record<PortfolioMemberRole, string> | null>(
    null
  );
  const [listError, setListError] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<PortfolioMemberRole | "">("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addAttempted, setAddAttempted] = useState(false);
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/members`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as MembersResponse & {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        setListError(data?.message ?? data?.error ?? "Could not load members.");
        setMembers([]);
        setProfiles({});
        setViewer(null);
        return;
      }

      setMembers(data.members ?? []);
      setProfiles(data.profiles ?? {});
      setViewer(data.viewer ?? null);
      setRoleSemantics((data.roleSemantics as Record<PortfolioMemberRole, string>) ?? null);
    } catch {
      setListError("Could not load members.");
      setMembers([]);
      setProfiles({});
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canInvite = viewer?.canInviteMembers ?? false;
  const canChangeRole = viewer?.canChangeMemberRoles ?? false;
  const canRemove = viewer?.canRemoveMembers ?? false;
  const showRowActions = canChangeRole || canRemove;

  const membersRows = useMemo(() => {
    const uid = viewer?.currentUserId;
    if (!uid) return members;
    return [...members].sort((a, b) => {
      const aSelf = a.user_id === uid ? 0 : 1;
      const bSelf = b.user_id === uid ? 0 : 1;
      return aSelf - bSelf;
    });
  }, [members, viewer?.currentUserId]);

  const roleSemanticsTooltip = useMemo(() => {
    const fallback: Record<PortfolioMemberRole, string> = {
      owner: "Edit portfolio details, invite, and manage member roles",
      editor: "Invite members; cannot edit portfolio details or manage roles",
      viewer: "View settings and members only",
    };
    const semantics = roleSemantics ?? fallback;
    return ROLE_OPTIONS.map(
      ({ value }) => `${value[0].toUpperCase()}${value.slice(1)}: ${semantics[value]}`
    ).join("\n");
  }, [roleSemantics]);

  const closeAddMemberModal = useCallback(() => {
    setIsAddMemberModalOpen(false);
    setAddError(null);
    setAddAttempted(false);
  }, []);

  useEffect(() => {
    if (!isAddMemberModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAddMemberModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeAddMemberModal, isAddMemberModalOpen]);

  const onAdd = async () => {
    setAddAttempted(true);
    setAddError(null);
    setRowActionError(null);
    const email = addEmail.trim();
    if (!email) {
      setAddError("Enter an email address.");
      return;
    }
    if (addRole === "") {
      setAddError(ADD_MEMBER_ROLE_VALIDATION_ERROR);
      return;
    }
    setPendingId("__add__");
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: addRole }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string };

      if (res.status === 404 && data?.error === "USER_NOT_FOUND") {
        setAddError(
          data.message ?? "No account found for this email. Ask them to register first, then add them."
        );
        return;
      }
      if (res.status === 409 && data?.error === "DUPLICATE_MEMBER") {
        setAddError(data.message ?? "This user is already a member.");
        return;
      }
      if (res.status === 403 && data?.error === "PERMISSION_DENIED") {
        setAddError(data.message ?? "Permission denied.");
        return;
      }
      if (!res.ok) {
        setAddError(data?.message ?? data?.error ?? "Could not add member.");
        return;
      }

      setAddEmail("");
      setAddRole("");
      setAddAttempted(false);
      setIsAddMemberModalOpen(false);
      await load();
    } finally {
      setPendingId(null);
    }
  };

  const onRoleChange = async (member: PortfolioMemberWithProfileRow, role: PortfolioMemberRole) => {
    setRowActionError(null);
    setAddError(null);
    setPendingId(member.id);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/members/${member.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string };

      if (res.status === 400 && data?.error === "CANNOT_CHANGE_SELF") {
        setRowActionError(data.message ?? "You cannot change your own role here.");
        return;
      }
      if (res.status === 400 && data?.error === "LAST_OWNER") {
        setRowActionError(data.message ?? "Cannot remove the last portfolio owner role.");
        return;
      }
      if (res.status === 403 && data?.error === "PERMISSION_DENIED") {
        setRowActionError(data.message ?? "Permission denied.");
        return;
      }
      if (!res.ok) {
        setRowActionError(data?.message ?? data?.error ?? "Could not update role.");
        return;
      }

      await load();
    } finally {
      setPendingId(null);
    }
  };

  const onRemove = async (member: PortfolioMemberWithProfileRow) => {
    setRowActionError(null);
    setAddError(null);
    setPendingId(member.id);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/members/${member.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string };

      if (res.status === 400 && data?.error === "LAST_OWNER") {
        setRowActionError(data.message ?? "Cannot remove the last portfolio owner role.");
        return;
      }
      if (res.status === 403 && data?.error === "PERMISSION_DENIED") {
        setRowActionError(data.message ?? "Permission denied.");
        return;
      }
      if (!res.ok) {
        setRowActionError(data?.message ?? data?.error ?? "Could not remove member.");
        return;
      }

      await load();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <Card className="mb-4 ds-card-table-shell">
        <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">
            Team Members
          </h2>
        </CardHeader>
        <CardBody className="!p-0">
          {listError || rowActionError ? (
            <div className={`space-y-3 px-4 pt-3${loading ? "" : " pb-3"}`}>
              {listError ? (
                <Callout status="danger" role="alert">
                  {listError}
                </Callout>
              ) : null}
              {rowActionError ? (
                <Callout status="warning" role="alert">
                  {rowActionError}
                </Callout>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="px-4 py-3">
              <LoadingPlaceholderCompact label="Loading members" />
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="overflow-x-auto rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-subtle)]">
                <Table className="table-fixed w-full [&_tbody_td]:py-[10px] [&_thead_th]:py-1.5 [&_thead_th]:text-[11px] [&_thead_th]:text-[var(--ds-text-muted)]">
                <colgroup>
                  <col style={{ width: MEMBERS_NAME_COLUMN_WIDTH }} />
                  <col />
                  <col style={{ width: MEMBERS_ROLE_COLUMN_WIDTH }} />
                  {showRowActions ? <col style={{ width: MEMBERS_ACTIONS_COLUMN_WIDTH }} /> : null}
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>
                      <span className="inline-flex items-center gap-1.5 pl-3">
                        <span>Role</span>
                        <span className="group relative inline-flex">
                          <button
                            type="button"
                            className="inline-flex h-4 w-4 items-center justify-center text-[12px] leading-none text-[var(--ds-text-muted)]"
                            aria-label={roleSemanticsTooltip}
                          >
                            ⓘ
                          </button>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-56 -translate-x-1/2 whitespace-pre-line rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-2 py-1.5 text-[10px] font-normal normal-case tracking-normal text-[var(--ds-text-secondary)] shadow-[var(--ds-shadow-sm)] group-hover:block group-focus-within:block"
                          >
                            {roleSemanticsTooltip}
                          </span>
                        </span>
                      </span>
                    </TableHeaderCell>
                    {showRowActions ? (
                      <TableHeaderCell className="text-center">Actions</TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {membersRows.map((m) => {
                    const normalizedProfile = normalizeResolvedProfile(m, profiles);
                    const displayName = computeDisplayName(normalizedProfile, m.email, m.user_id);
                    const displayEmail = computeDisplayEmail(normalizedProfile, m.email);
                    const isSelf = viewer?.currentUserId === m.user_id;
                    const busy = pendingId === m.id;
                    return (
                      <TableRow
                        key={m.id}
                        className={isSelf ? membersTableCurrentUserRowClass : ""}
                      >
                        <TableCell className="text-[var(--ds-text-primary)]">{displayName}</TableCell>
                        <TableCell className="text-[var(--ds-text-secondary)]">{displayEmail}</TableCell>
                        <TableCell>
                          {canChangeRole && !isSelf ? (
                            <select
                              className={projectSettingsSelectClass(false, "sm")}
                              value={m.role}
                              disabled={busy}
                              aria-label={`Role for ${displayName}`}
                              onChange={(e) => {
                                const next = e.target.value as PortfolioMemberRole | string;
                                if (!isStandardPortfolioRole(next)) return;
                                if (next !== m.role) void onRoleChange(m, next);
                              }}
                            >
                              {!isStandardPortfolioRole(m.role) && (
                                <option value={m.role}>
                                  {m.role} (current)
                                </option>
                              )}
                              {ROLE_OPTIONS.map(({ value, label }) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex h-9 w-full items-center px-3 py-1 capitalize text-[var(--ds-text-primary)]">
                              {m.role}
                            </span>
                          )}
                        </TableCell>
                        {showRowActions ? (
                          <TableCell>
                            <div className={membersActionsSlotOuterClass}>
                              <div className={membersActionsSlotInnerClass}>
                                {canRemove && !isSelf ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    className="ds-action-danger"
                                    onClick={() => void onRemove(m)}
                                  >
                                    Remove
                                  </Button>
                                ) : (
                                  <span className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!loading && membersRows.length === 0 && !listError ? (
            <div className="border-t border-[var(--ds-border-subtle)] px-4 py-3">
              <HelperText className="!mt-0">No members yet.</HelperText>
            </div>
          ) : null}

          {viewer ? (
            <ProjectMemberPermissionHints
              resource="portfolio"
              canInviteMembers={viewer.canInviteMembers}
              canChangeMemberRoles={viewer.canChangeMemberRoles}
            />
          ) : null}

          {canInvite ? (
            <div className="px-4 pb-3">
              <button
                type="button"
                className="ds-dashboard-inline-create"
                onClick={() => setIsAddMemberModalOpen(true)}
              >
                <span className="ds-dashboard-inline-create-label">Invite User</span>
                <span className="ds-dashboard-inline-create-plus" aria-hidden>
                  +
                </span>
              </button>
            </div>
          ) : null}
        </CardBody>
      </Card>
      {canInvite && isAddMemberModalOpen
        ? createPortal(
            <div
              className="ds-modal-backdrop z-[110]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="portfolio-add-member-title"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeAddMemberModal();
              }}
            >
              <div
                className="ds-modal-panel ds-modal-panel--fit-content w-full !max-w-md !min-h-0"
                style={{ maxWidth: "28rem" }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="ds-modal-panel-header">
                  <h2 id="portfolio-add-member-title" className="ds-modal-panel-title">
                    Invite member
                  </h2>
                  <button
                    type="button"
                    onClick={closeAddMemberModal}
                    className="ds-onboarding-modal-close"
                    aria-label="Close"
                  >
                    <span aria-hidden className="ds-modal-panel-close-icon">
                      ×
                    </span>
                  </button>
                </div>
                <div className="ds-modal-panel-body">
                  <div className="mx-auto flex w-full max-w-md flex-col gap-3">
                    <div>
                      <input
                        id="portfolio-member-email"
                        type="email"
                        autoComplete="off"
                        aria-label="Email"
                        className={projectSettingsInputClass(false)}
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        placeholder="name@company.com"
                      />
                    </div>
                    <div>
                      <select
                        id="portfolio-member-role"
                        className={`${projectSettingsSelectClass(addAttempted && addRole === "", "md")} ${
                          addRole === "" ? "!text-[var(--ds-text-muted)]" : "!text-[var(--ds-text-primary)]"
                        }`}
                        aria-label="Role"
                        value={addRole}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAddRole(v === "" ? "" : (v as PortfolioMemberRole));
                        }}
                      >
                        <option value="" disabled>
                          {ADD_MEMBER_ROLE_PLACEHOLDER_LABEL}
                        </option>
                        {ROLE_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => void onAdd()}
                        disabled={pendingId === "__add__"}
                      >
                        Invite
                      </Button>
                    </div>
                    {addError ? <FieldError className="!mt-0">{addError}</FieldError> : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
