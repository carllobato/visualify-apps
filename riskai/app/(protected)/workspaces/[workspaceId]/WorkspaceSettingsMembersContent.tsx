"use client";

import { useEffect } from "react";
import { WorkspaceSettingsTabsNav } from "@/components/workspace/WorkspaceSettingsTabsNav";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import {
  MEMBERS_NAME_COLUMN_WIDTH,
  MEMBERS_ROLE_COLUMN_WIDTH,
  membersTableCurrentUserRowClass,
} from "@/components/project/projectSettingsDsFormClasses";
import type { WorkspaceMemberListItem } from "@/lib/workspace/listActiveWorkspaceMembers";
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  HelperText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";

export type WorkspaceSettingsMembersContentProps = {
  workspaceId: string;
  currentUserId: string;
  members: WorkspaceMemberListItem[];
  loadError: string | null;
};

function displayEmail(email: string | null): string {
  const trimmed = email?.trim();
  return trimmed ? trimmed : "—";
}

export function WorkspaceSettingsMembersContent({
  workspaceId,
  currentUserId,
  members,
  loadError,
}: WorkspaceSettingsMembersContentProps) {
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;

  useEffect(() => {
    if (!setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "", end: null });
    return () => setPageHeaderExtras(null);
  }, [setPageHeaderExtras]);

  return (
    <main className="w-full px-4 py-6 sm:px-6">
      <WorkspaceSettingsTabsNav workspaceId={workspaceId} activeTab="members" />

      <Card className="mb-4 ds-card-table-shell">
        <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Members</h2>
        </CardHeader>
        <CardBody className="!p-0">
          {loadError ? (
            <div className="px-4 py-3">
              <Callout status="danger" role="alert">
                {loadError}
              </Callout>
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="overflow-x-auto rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-subtle)]">
                <Table className="table-fixed w-full [&_tbody_td]:py-[10px] [&_thead_th]:py-1.5 [&_thead_th]:text-[11px] [&_thead_th]:text-[var(--ds-text-muted)]">
                  <colgroup>
                    <col style={{ width: MEMBERS_NAME_COLUMN_WIDTH }} />
                    <col />
                    <col style={{ width: MEMBERS_ROLE_COLUMN_WIDTH }} />
                  </colgroup>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Email</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => {
                      const isSelf = member.userId === currentUserId;
                      return (
                        <TableRow
                          key={member.userId}
                          className={isSelf ? membersTableCurrentUserRowClass : ""}
                        >
                          <TableCell className="text-[var(--ds-text-primary)]">{member.name}</TableCell>
                          <TableCell className="text-[var(--ds-text-secondary)]">
                            {displayEmail(member.email)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex h-9 w-full items-center px-3 py-1 text-[var(--ds-text-primary)]">
                              {member.roleLabel}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!loadError && members.length === 0 ? (
            <div className="border-t border-[var(--ds-border-subtle)] px-4 py-3">
              <HelperText className="!mt-0">No members yet.</HelperText>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </main>
  );
}
