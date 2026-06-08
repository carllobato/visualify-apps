import { VISUALIFY_BRAND_MARK_SRC } from "@/components/visualify-brand";

export type VisualifyBrandMarkProps = {
  alt?: string;
  className?: string;
  size?: number;
};

/** Visualify symbol for compact headers and hero accents. */
export function VisualifyBrandMark({
  alt = "",
  className = "",
  size = 32,
}: VisualifyBrandMarkProps) {
  return (
    <img
      src={VISUALIFY_BRAND_MARK_SRC}
      alt={alt}
      width={size}
      height={size}
      className={`vf-visualify-brand-mark block shrink-0 object-contain ${className}`.trim()}
      draggable={false}
    />
  );
}
