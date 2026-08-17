"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  /** When no image loads, shown instead of initials / the generic workspace icon. */
  fallback?: ReactNode;
};

function isGoogleFaviconServiceUrl(src: string): boolean {
  try {
    const { hostname, pathname } = new URL(src);
    if (hostname === "www.google.com" || hostname === "google.com") {
      return pathname.includes("/s2/favicons");
    }
    return hostname.endsWith(".gstatic.com") && pathname.toLowerCase().includes("favicon");
  } catch {
    return false;
  }
}

/**
 * Google’s missing-favicon globe is 16×16 even when `sz=128` is requested (often a 404 PNG body).
 * Only skip that placeholder — real 16×16 `.ico` marks from the workspace site must still show.
 */
function isUsableAvatarImage(
  img: Pick<HTMLImageElement, "naturalWidth" | "naturalHeight">,
  src: string,
): boolean {
  const { naturalWidth: width, naturalHeight: height } = img;
  if (width <= 0 || height <= 0) {
    return false;
  }
  if (isGoogleFaviconServiceUrl(src) && width <= 16 && height <= 16) {
    return false;
  }
  return true;
}

/**
 * Entity mark for rails and tiles: try each image URL in order, then `fallback`, then initials,
 * then a generic icon. Products supply URLs and mark; shell owns layout and fallback behaviour.
 */
export function AppShellEntityAvatar({
  imageUrls,
  initials = null,
  size = "tile",
  fallback = null,
}: AppShellEntityAvatarProps) {
  const styles = AVATAR_STYLES[size];
  const initialsClass = `${styles.frame} ${styles.content} ${styles.initials}`;
  const fallbackClass = `${styles.frame} ${styles.content}`;
  const genericFallbackClass = `${fallbackClass} text-[var(--ds-text-tertiary)]`;

  const imageUrlsKey = imageUrls.map((u) => u?.trim() ?? "").join("\0");

  const sources = useMemo(
    () => imageUrls.map((u) => u?.trim()).filter((u): u is string => Boolean(u)),
    [imageUrlsKey],
  );

  const [sourceIndex, setSourceIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setImageReady(false);
  }, [imageUrlsKey]);

  const rejectActiveSource = () => {
    setImageReady(false);
    setSourceIndex((i) => i + 1);
  };

  const activeSrc = sources[sourceIndex];

  const fallbackInner = fallback ?? (initials ? initials : <IconWorkspaceFallback size={styles.iconPx} />);
  const fallbackWrapClass = fallback
    ? fallbackClass
    : initials
      ? initialsClass
      : genericFallbackClass;

  if (!activeSrc) {
    return (
      <span className={fallbackWrapClass} aria-hidden>
        {fallbackInner}
      </span>
    );
  }

  return (
    <span
      className={imageReady ? `${styles.frame} relative ${styles.image}` : `${fallbackWrapClass} relative`}
      aria-hidden
    >
      {imageReady ? null : fallbackInner}
      <img
        src={activeSrc}
        alt=""
        width={styles.imgPx}
        height={styles.imgPx}
        referrerPolicy="no-referrer"
        decoding="async"
        className={
          imageReady
            ? `size-full ${styles.image}`
            : "pointer-events-none absolute left-0 top-0 size-px opacity-0"
        }
        onError={rejectActiveSource}
        onLoad={(event) => {
          if (!isUsableAvatarImage(event.currentTarget, activeSrc)) {
            rejectActiveSource();
            return;
          }
          setImageReady(true);
        }}
      />
    </span>
  );
}
