/**
 * Pure active-workspace selection from entitled workspaces + cookie id.
 * Cookie id is only accepted when it matches an entitled workspace id.
 */
export function resolveActiveWorkspaceSelection(params: {
  workspaceIds: readonly string[];
  cookieWorkspaceId: string | null | undefined;
}): {
  selectedWorkspaceId: string | null;
  needsSelection: boolean;
} {
  const ids = params.workspaceIds.map((id) => id.trim()).filter((id) => id.length > 0);

  if (ids.length === 0) {
    return { selectedWorkspaceId: null, needsSelection: false };
  }

  const cookieId =
    typeof params.cookieWorkspaceId === "string" ? params.cookieWorkspaceId.trim() : "";
  if (cookieId && ids.includes(cookieId)) {
    return { selectedWorkspaceId: cookieId, needsSelection: false };
  }

  if (ids.length === 1) {
    return { selectedWorkspaceId: ids[0]!, needsSelection: false };
  }

  return { selectedWorkspaceId: null, needsSelection: true };
}
