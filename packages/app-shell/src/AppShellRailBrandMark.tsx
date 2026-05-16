export type AppShellRailBrandMarkProps = {
  src: string;
  alt?: string;
};

/** Default 40×40 brand mark for {@link AppShellRailBrandAppMenu}. */
export function AppShellRailBrandMark({ src, alt = "" }: AppShellRailBrandMarkProps) {
  return (
    <img src={src} alt={alt} width={40} height={40} className="size-10 shrink-0 object-contain" />
  );
}
