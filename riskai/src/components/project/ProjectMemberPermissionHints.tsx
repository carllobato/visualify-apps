import { HelperText } from "@visualify/design-system";

type ResourceKind = "portfolio" | "project";

/** DS-styled permission footnotes for Project members (project settings only). */
export function ProjectMemberPermissionHints({
  resource,
  canInviteMembers,
  canChangeMemberRoles,
}: {
  resource: ResourceKind;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
}) {
  const ownerPhrase = resource === "portfolio" ? "portfolio owner" : "project owner";

  return (
    <>
      {!canInviteMembers && (
        <HelperText className="!mt-3">
          You can view members. Only owners and editors can invite; only owners can change roles or remove
          members.
        </HelperText>
      )}
      {canInviteMembers && !canChangeMemberRoles && (
        <HelperText className="!mt-3">
          You can invite members. Only a {ownerPhrase} can change roles or remove members.
        </HelperText>
      )}
    </>
  );
}
