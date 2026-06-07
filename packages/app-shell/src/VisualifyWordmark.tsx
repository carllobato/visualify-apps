import { mergeClass } from "./account-settings/merge-class";
import {
  VISUALIFY_LOGO_DARK_SRC,
  VISUALIFY_LOGO_LIGHT_SRC,
  visualifyWordmarkClassName,
} from "./visualify-brand";

export type VisualifyWordmarkProps = {
  /** Light-theme wordmark (black on transparent). */
  lightSrc?: string;
  /** Dark-theme wordmark (white on transparent). */
  darkSrc?: string;
  alt?: string;
  className?: string;
};

/** Theme-aware full Visualify wordmark (symbol + name) for login cards and marketing shells. */
export function VisualifyWordmark({
  lightSrc = VISUALIFY_LOGO_LIGHT_SRC,
  darkSrc = VISUALIFY_LOGO_DARK_SRC,
  alt = "Visualify",
  className,
}: VisualifyWordmarkProps) {
  return (
    <span className={mergeClass(visualifyWordmarkClassName, className)}>
      <img
        src={lightSrc}
        alt={alt}
        className="vf-visualify-wordmark__light"
        draggable={false}
      />
      <img
        src={darkSrc}
        alt={alt}
        className="vf-visualify-wordmark__dark"
        draggable={false}
      />
    </span>
  );
}
