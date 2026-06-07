import { VisualifyBrandMark } from "./VisualifyBrandMark";
import { VISUALIFY_BRAND_MARK_RAIL_PX } from "./visualify-brand";

export type AppShellRailBrandMarkProps = {
  src?: string;
  alt?: string;
};

/** Default symbol for {@link AppShellRailBrandAppMenu} — sized within the 40px icon well. */
export function AppShellRailBrandMark({ src, alt = "" }: AppShellRailBrandMarkProps) {
  return (
    <VisualifyBrandMark src={src} alt={alt} width={VISUALIFY_BRAND_MARK_RAIL_PX} height={VISUALIFY_BRAND_MARK_RAIL_PX} />
  );
}
