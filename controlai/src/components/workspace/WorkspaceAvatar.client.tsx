"use client";

import { useMemo } from "react";
import { AppShellEntityAvatar, type AppShellEntityAvatarSize } from "@visualify/app-shell";
import { resolveWorkspaceFaviconUrl } from "@/lib/workspace-favicon";

export type WorkspaceAvatarSize = AppShellEntityAvatarSize;

/** Workspace mark — favicon first, then stored logo, then initials. */
export function WorkspaceAvatar({
  logoUrl,
  websiteUrl,
  avatarInitials,
  size = "tile",
}: {
  logoUrl: string | null;
  websiteUrl: string | null;
  avatarInitials: string | null;
  size?: WorkspaceAvatarSize;
}) {
  const faviconUrl = resolveWorkspaceFaviconUrl(websiteUrl);
  const imageUrls = useMemo(() => [faviconUrl, logoUrl], [faviconUrl, logoUrl]);

  return (
    <AppShellEntityAvatar
      size={size}
      imageUrls={imageUrls}
      initials={avatarInitials}
    />
  );
}
