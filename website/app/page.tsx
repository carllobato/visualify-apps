import { ComingSoonBody } from "@/components/coming-soon-body";
import { HeroBackground } from "@/components/hero-background";

export default function Home() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <HeroBackground />
      <ComingSoonBody />
    </div>
  );
}
