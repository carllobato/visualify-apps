import { VisualifyBrandMark } from "../VisualifyBrandMark";
import { VISUALIFY_BRAND_MARK_CARD_PX, VISUALIFY_BRAND_MARK_RAIL_PX } from "../visualify-brand";
import { appLoginBrandMarkCardClassName, appLoginBrandMarkRailClassName } from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginBrandMarkProps = {
  src?: string;
  alt?: string;
  /**
   * `rail` — matches {@link AppShellRailBrandMark} in platform rails.
   * `card` — optional use in {@link AppLoginCardHeader}.
   */
  variant?: "rail" | "card";
  className?: string;
};

const sizePx = { rail: VISUALIFY_BRAND_MARK_RAIL_PX, card: VISUALIFY_BRAND_MARK_CARD_PX } as const;

/** Standard Visualify symbol for login / signed-out framed shells. */
export function AppLoginBrandMark({
  src,
  alt = "",
  variant = "rail",
  className,
}: AppLoginBrandMarkProps) {
  const px = sizePx[variant];
  const sizeClass = variant === "rail" ? appLoginBrandMarkRailClassName : appLoginBrandMarkCardClassName;

  return (
    <VisualifyBrandMark
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={mergeClass(sizeClass, className)}
    />
  );
}
