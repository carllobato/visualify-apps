import type { CSSProperties } from "react";
import {
  VISUALIFY_LOGO_DARK_SRC,
  VISUALIFY_LOGO_LIGHT_SRC,
} from "@/components/visualify-brand";

export type VisualifyWordmarkProps = {
  alt?: string;
  className?: string;
  /** Wordmark height in pixels (width scales automatically). */
  height?: number;
};

/** Theme-aware full Visualify wordmark for marketing headers and hero shells. */
export function VisualifyWordmark({
  alt = "Visualify",
  className = "",
  height = 28,
}: VisualifyWordmarkProps) {
  return (
    <span
      className={`vf-visualify-wordmark block w-fit max-w-full shrink-0 ${className}`.trim()}
      style={{ "--vf-wordmark-height": `${height}px` } as CSSProperties}
    >
      <img
        src={VISUALIFY_LOGO_LIGHT_SRC}
        alt={alt}
        className="vf-visualify-wordmark__light"
        draggable={false}
      />
      <img
        src={VISUALIFY_LOGO_DARK_SRC}
        alt={alt}
        className="vf-visualify-wordmark__dark"
        draggable={false}
      />
    </span>
  );
}
