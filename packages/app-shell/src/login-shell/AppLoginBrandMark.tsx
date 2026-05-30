import {
  appLoginBrandMarkCardClassName,
  appLoginBrandMarkRailClassName,
} from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginBrandMarkProps = {
  src: string;
  alt?: string;
  /**
   * `rail` — 40×40, matches {@link AppShellRailBrandMark} in platform rails.
   * `card` — 48×48 for optional use in {@link AppLoginCardHeader}.
   */
  variant?: "rail" | "card";
  className?: string;
};

const sizePx = { rail: 40, card: 48 } as const;

/** Standard Visualify brand mark for login / signed-out framed shells. */
export function AppLoginBrandMark({
  src,
  alt = "",
  variant = "rail",
  className,
}: AppLoginBrandMarkProps) {
  const px = sizePx[variant];
  const sizeClass = variant === "rail" ? appLoginBrandMarkRailClassName : appLoginBrandMarkCardClassName;

  return (
    <img
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={mergeClass(sizeClass, className)}
    />
  );
}
