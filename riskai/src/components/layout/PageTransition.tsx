"use client";

import type { RefObject } from "react";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

type PageTransitionProps = {
  children: React.ReactNode;
  /** When set, reset this element’s scroll on navigation; otherwise reset `window`. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

/**
 * `key={pathname}` remounts this wrapper on every client-side URL change inside the shell so
 * each route gets a fresh subtree. `initial={false}` keeps content visible immediately (avoids
 * long or stuck opacity-0 fades after RSC navigations such as onboarding redirects).
 *
 * Async RSC children suspend during SSR; a motion-only wrapper can hydrate as Suspense vs motion
 * mismatch. We SSR a stable `div`, then enable motion after mount.
 */
export function PageTransition({ children, scrollContainerRef }: PageTransitionProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() === true;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const el = scrollContainerRef?.current;
    if (el) el.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [pathname, scrollContainerRef]);

  const inner = <Suspense fallback={null}>{children}</Suspense>;

  if (!mounted) {
    return <div className="min-h-0 w-full">{inner}</div>;
  }

  return (
    <motion.div
      key={pathname}
      className="min-h-0 w-full"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {inner}
    </motion.div>
  );
}
