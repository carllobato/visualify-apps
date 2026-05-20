/** First letter of given name + first letter of surname (e.g. Carl + Lobato → CL). */
export function personInitials(firstName: string | null | undefined, surname: string | null | undefined): string | null {
  const first = firstName?.trim() ?? "";
  const last = surname?.trim() ?? "";
  if (!first || !last) return null;
  return `${first[0]}${last[0]}`.toUpperCase();
}

/** Fallback when no logo/favicon: first + last token, or first two letters of a single word. */
export function workspaceDisplayInitials(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const word = parts[0];
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word.slice(0, 1).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function resolveWorkspaceTileAvatarInitials(params: {
  workspaceType: string;
  workspaceName: string;
  ownerFirstName: string | null;
  ownerSurname: string | null;
}): string | null {
  if (params.workspaceType.trim().toLowerCase() === "personal") {
    const fromProfile = personInitials(params.ownerFirstName, params.ownerSurname);
    if (fromProfile) return fromProfile;
  }
  return workspaceDisplayInitials(params.workspaceName);
}
