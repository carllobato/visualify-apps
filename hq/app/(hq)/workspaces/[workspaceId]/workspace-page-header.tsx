"use client";

import { appShellPageTitleClassName, shellPageHeaderRailRowClassName } from "@visualify/app-shell";
import { WorkspaceAvatar } from "@/components/workspace-avatar.client";
import { resolveWorkspaceTileAvatarInitials } from "@/lib/workspace-avatar-initials";

export function WorkspacePageHeader({
  workspaceName,
  websiteUrl,
  workspaceType = "",
  logoUrl = null,
}: {
  workspaceName: string;
  websiteUrl: string | null;
  workspaceType?: string;
  logoUrl?: string | null;
}) {
  const avatarInitials = resolveWorkspaceTileAvatarInitials({
    workspaceType,
    workspaceName,
    ownerFirstName: null,
    ownerSurname: null,
  });

  return (
    <header className="mb-2 flex items-center gap-3">
      <WorkspaceAvatar
        size="page"
        logoUrl={logoUrl}
        websiteUrl={websiteUrl}
        avatarInitials={avatarInitials}
      />
      <div className={`min-w-0 flex-1 ${shellPageHeaderRailRowClassName}`}>
        <h1 className={appShellPageTitleClassName}>{workspaceName}</h1>
      </div>
    </header>
  );
}
