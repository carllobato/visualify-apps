import "./visualify-brand.css";
import { mergeClass } from "./account-settings/merge-class";
import { VISUALIFY_BRAND_MARK_SRC, visualifyBrandMarkClassName } from "./visualify-brand";

export type VisualifyBrandMarkProps = {
  /** Symbol asset URL — host app serves `public/visualify-brand-mark.png`. */
  src?: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
};

/** Visualify symbol for rails, login shells, and mobile headers. */
export function VisualifyBrandMark({
  src = VISUALIFY_BRAND_MARK_SRC,
  alt = "",
  width,
  height,
  className,
}: VisualifyBrandMarkProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={mergeClass(visualifyBrandMarkClassName, className)}
      draggable={false}
    />
  );
}
