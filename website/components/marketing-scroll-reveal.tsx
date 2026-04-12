"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

/** Delay between consecutive items in a stagger group (ms). */
const STAGGER_STEP_MS = 130;

const transitionEnterClass =
  "transition-[opacity,transform] duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

function useInViewRevealOnce() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setInView(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) {
          setInView(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "0px 0px -12% 0px", threshold: [0, 0.06, 0.12] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const revealed = prefersReducedMotion || inView;
  return { ref, revealed, prefersReducedMotion };
}

type MarketingScrollRevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Fade + slight upward motion when the block enters the viewport.
 * Fires once; honours prefers-reduced-motion (no animation, content stays visible).
 */
export function MarketingScrollReveal({ children, className = "", id }: MarketingScrollRevealProps) {
  const { ref, revealed, prefersReducedMotion } = useInViewRevealOnce();

  return (
    <div
      id={id}
      ref={ref}
      className={
        `${className} motion-reduce:translate-y-0 motion-reduce:opacity-100 ` +
        (prefersReducedMotion ? "" : `${transitionEnterClass} `) +
        (revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")
      }
    >
      {children}
    </div>
  );
}

type StaggerContextValue = {
  revealed: boolean;
  reduced: boolean;
};

const StaggerRevealContext = createContext<StaggerContextValue | null>(null);

type MarketingScrollRevealGroupProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * One viewport trigger for the whole block; pair inner content with {@link MarketingScrollRevealItem}
 * so children animate in sequence instead of all at once.
 */
export function MarketingScrollRevealGroup({ children, className = "", id }: MarketingScrollRevealGroupProps) {
  const { ref, revealed, prefersReducedMotion } = useInViewRevealOnce();

  return (
    <StaggerRevealContext.Provider value={{ revealed, reduced: prefersReducedMotion }}>
      <div id={id} ref={ref} className={className}>
        {children}
      </div>
    </StaggerRevealContext.Provider>
  );
}

type MarketingScrollRevealItemProps = {
  children: ReactNode;
  className?: string;
  /** Zero-based order within the group; sets `transition-delay` for the reveal. */
  index: number;
};

/**
 * Staggered child of {@link MarketingScrollRevealGroup}. Outside a group, renders without hide animation.
 */
export function MarketingScrollRevealItem({ children, className = "", index }: MarketingScrollRevealItemProps) {
  const ctx = useContext(StaggerRevealContext);
  const revealed = ctx?.revealed ?? true;
  const reduced = ctx?.reduced ?? true;
  const delayMs = reduced ? 0 : index * STAGGER_STEP_MS;

  return (
    <div
      className={
        `${className} motion-reduce:translate-y-0 motion-reduce:opacity-100 ` +
        (reduced ? "" : `${transitionEnterClass} `) +
        (revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")
      }
      style={{
        transitionDelay: revealed && !reduced ? `${delayMs}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}
