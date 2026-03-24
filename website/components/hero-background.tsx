import Image from "next/image";

const HERO_LIGHT = "/images/hero-light.jpg";
const HERO_DARK = "/images/hero-dark.jpg";

export function HeroBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 min-h-dvh w-full">
      <Image
        src={HERO_LIGHT}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center dark:hidden"
      />
      <Image
        src={HERO_DARK}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hidden object-cover object-center dark:block"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/26 via-white/12 to-white/30 dark:from-zinc-950/75 dark:via-zinc-950/50 dark:to-zinc-950/94"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(37,99,235,0.02),transparent_60%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(59,130,246,0.08),transparent_60%)]"
        aria-hidden
      />
    </div>
  );
}
