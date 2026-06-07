"use client";

import { useEffect, useMemo, useState } from "react";

export type AppShellEntityAvatarSize = "rail" | "tile" | "page";

const AVATAR_STYLES: Record<
  AppShellEntityAvatarSize,
  { frame: string; image: string; content: string; initials: string; imgPx: number; iconPx: number }
> = {
  rail: {
    frame: "flex size-8 shrink-0 overflow-hidden rounded-[var(--ds-radius-sm)]",
    image: "items-center justify-center object-contain",
    content: "items-center justify-center",
    initials: "text-xs font-semibold leading-none tracking-tight text-[var(--ds-text-primary)]",
    imgPx: 32,
    iconPx: 18,
  },
  tile: {
    frame: "flex size-8 shrink-0 overflow-hidden rounded-[var(--ds-radius-sm)]",
    image: "items-start justify-start object-contain object-top",
    content: "items-center justify-center",
    initials: "text-2xl font-semibold leading-none tracking-tight text-[var(--ds-text-primary)]",
    imgPx: 32,
    iconPx: 14,
  },
  page: {
    frame: "flex size-11 shrink-0 overflow-hidden rounded-[var(--ds-radius-md)]",
    image: "items-center justify-center object-contain",
    content: "items-center justify-center",
    initials: "text-[length:var(--ds-text-sm)] font-medium leading-none tracking-tight text-[var(--ds-text-secondary)]",
    imgPx: 44,
    iconPx: 20,
  },
};

function IconWorkspaceFallback({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--ds-text-tertiary)]">
      <path d="M4 21h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M6 21V9l6-4 6 4v12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21v-5h4v5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export type AppShellEntityAvatarProps = {
  /** Image URLs in priority order (e.g. favicon, then stored logo). */
  imageUrls: readonly (string | null | undefined)[];
  initials?: string | null;
  size?: AppShellEntityAvatarSize;
};

/**
 * Entity mark for rails and tiles: try each image URL in order, then initials, then a generic icon.
 * Products supply URLs and initials; shell owns layout and fallback behaviour.
 */
export function AppShellEntityAvatar({
  imageUrls,
  initials = null,
  size = "tile",
}: AppShellEntityAvatarProps) {
  const styles = AVATAR_STYLES[size];
  const imageClass = `${styles.frame} ${styles.image}`;
  const initialsClass = `${styles.frame} ${styles.content} ${styles.initials}`;
  const fallbackClass = `${styles.frame} ${styles.content} text-[var(--ds-text-tertiary)]`;

  const imageUrlsKey = imageUrls.map((u) => u?.trim() ?? "").join("\0");

  const sources = useMemo(
    () => imageUrls.map((u) => u?.trim()).filter((u): u is string => Boolean(u)),
    [imageUrlsKey],
  );

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [imageUrlsKey]);

  const activeSrc = sources[sourceIndex];

  if (activeSrc) {
    return (
      <img
        src={activeSrc}
        alt=""
        width={styles.imgPx}
        height={styles.imgPx}
        className={imageClass}
        onError={() => setSourceIndex((i) => i + 1)}
      />
    );
  }

  if (initials) {
    return (
      <span className={initialsClass} aria-hidden>
        {initials}
      </span>
    );
  }

  return (
    <span className={fallbackClass} aria-hidden>
      <IconWorkspaceFallback size={styles.iconPx} />
    </span>
  );
}
