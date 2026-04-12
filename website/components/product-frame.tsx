import Image from "next/image";

/** Matches current RiskAI marketing PNGs (2616×1822). Keeps next/image layout ratio correct. */
const DEFAULT_IMAGE_WIDTH = 2616;
const DEFAULT_IMAGE_HEIGHT = 1822;

/** Card-aligned hover: lift, surface, border, shadow (marketing tiles). */
const frameInteractiveBaseClass =
  "cursor-default transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out " +
  "hover:-translate-y-0.5 hover:bg-[var(--ds-surface-hover)] " +
  "hover:border-[color-mix(in_oklab,var(--ds-border-subtle)_65%,transparent)] " +
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:bg-[var(--ds-surface)] " +
  "motion-reduce:hover:border-[var(--ds-border-subtle)]";

const frameInteractiveShadowDefaultClass =
  "hover:!shadow-[var(--ds-elevation-tile-hover)] motion-reduce:hover:!shadow-[var(--ds-elevation-tile)]";

const frameInteractiveShadowProminentClass =
  "hover:!shadow-[0_2px_6px_color-mix(in_oklab,var(--ds-scrim-ink)_8%,transparent),0_18px_48px_-6px_color-mix(in_oklab,var(--ds-scrim-ink)_16%,transparent),0_38px_84px_-12px_color-mix(in_oklab,var(--ds-scrim-ink)_21%,transparent)] " +
  "dark:hover:!shadow-[0_4px_22px_rgba(0,0,0,0.55),0_34px_76px_-10px_rgba(0,0,0,0.72)] " +
  "motion-reduce:hover:!shadow-[0_1px_3px_color-mix(in_oklab,var(--ds-scrim-ink)_7%,transparent),0_14px_40px_-6px_color-mix(in_oklab,var(--ds-scrim-ink)_14%,transparent),0_32px_72px_-12px_color-mix(in_oklab,var(--ds-scrim-ink)_19%,transparent)] " +
  "dark:motion-reduce:hover:!shadow-[0_2px_16px_rgba(0,0,0,0.5),0_28px_64px_-10px_rgba(0,0,0,0.65)]";

export type ProductFrameProps = {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
  /** Intrinsic pixel width of both assets (for aspect ratio / CLS). */
  imageWidth?: number;
  /** Intrinsic pixel height of both assets. */
  imageHeight?: number;
  /** Eagerly load and preload both variants (use for above-the-fold hero). */
  priority?: boolean;
  /** Passed to next/image `sizes` when the frame sits in a non-default-width layout. */
  sizes?: string;
  /** Deeper shadow + rim so the frame reads above muted section backgrounds (layout unchanged). */
  prominent?: boolean;
  /** Subtle lift + shadow/surface on hover (aligned with marketing `Card` tiles). */
  interactive?: boolean;
  /** Wraps both light/dark images (e.g. max height + overflow clip). Omitted when unset. */
  imageContainerClassName?: string;
  /** Appended to each next/image (e.g. object-cover). */
  imageClassName?: string;
  /** When false, hides the decorative window-chrome bar for a flatter product crop. */
  showWindowChrome?: boolean;
};

export function ProductFrame({
  lightSrc,
  darkSrc,
  alt,
  className = "",
  imageWidth = DEFAULT_IMAGE_WIDTH,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
  priority,
  sizes: sizesProp,
  prominent,
  interactive,
  imageContainerClassName,
  imageClassName,
  showWindowChrome = true,
}: ProductFrameProps) {
  const sizes = sizesProp ?? "(max-width: 1024px) 100vw, min(1280px, 92vw)";

  const imgExtra = imageClassName ? ` ${imageClassName}` : "";
  const images = (
    <>
      <Image
        src={lightSrc}
        alt={alt}
        width={imageWidth}
        height={imageHeight}
        className={`block h-auto w-full dark:hidden${imgExtra}`}
        sizes={sizes}
        priority={priority}
      />
      <Image
        src={darkSrc}
        alt={alt}
        width={imageWidth}
        height={imageHeight}
        className={`hidden h-auto w-full dark:block${imgExtra}`}
        sizes={sizes}
        priority={priority}
      />
    </>
  );

  const frameSurface = prominent
    ? "border-[color-mix(in_oklab,var(--ds-border-card)_96%,transparent)] bg-[var(--ds-surface)] " +
      "shadow-[0_1px_3px_color-mix(in_oklab,var(--ds-scrim-ink)_7%,transparent),0_14px_40px_-6px_color-mix(in_oklab,var(--ds-scrim-ink)_14%,transparent),0_32px_72px_-12px_color-mix(in_oklab,var(--ds-scrim-ink)_19%,transparent)] " +
      "ring-1 ring-inset ring-[color-mix(in_oklab,var(--ds-text-primary)_10%,transparent)] " +
      "dark:border-[color-mix(in_oklab,var(--ds-border)_82%,transparent)] " +
      "dark:shadow-[0_2px_16px_rgba(0,0,0,0.5),0_28px_64px_-10px_rgba(0,0,0,0.65)] " +
      "dark:ring-[color-mix(in_oklab,var(--ds-text-primary)_20%,transparent)]"
    : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] shadow-[var(--ds-elevation-tile)]";

  const interactiveClass =
    interactive === true
      ? ` ${frameInteractiveBaseClass} ${prominent ? frameInteractiveShadowProminentClass : frameInteractiveShadowDefaultClass}`
      : "";

  return (
    <div
      className={`overflow-hidden rounded-[var(--ds-radius-md)] border ${frameSurface}${interactiveClass} ${className}`}
    >
      {showWindowChrome ? (
        <div
          className="flex h-9 shrink-0 items-center gap-2.5 border-b border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_52%,var(--ds-surface))] px-2.5 sm:h-10 sm:gap-3 sm:px-3"
          aria-hidden
        >
          <div className="flex shrink-0 items-center gap-[5px] sm:gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--ds-danger)_58%,var(--ds-surface-muted))]" />
            <span className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--ds-warning)_52%,var(--ds-surface-muted))]" />
            <span className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--ds-success)_50%,var(--ds-surface-muted))]" />
          </div>
        </div>
      ) : null}
      <div
        className={
          prominent
            ? "relative bg-[var(--ds-surface)] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--ds-scrim-ink)_7%,transparent)] dark:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--ds-text-primary)_16%,transparent)]"
            : "relative bg-[var(--ds-surface)]"
        }
      >
        {imageContainerClassName ? (
          <div className={imageContainerClassName}>{images}</div>
        ) : (
          images
        )}
      </div>
    </div>
  );
}
