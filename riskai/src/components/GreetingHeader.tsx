"use client";

import { useEffect, useState } from "react";

/** Local-time greeting buckets (05:00–11:59 morning, 12:00–17:59 afternoon, else evening). */
export function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

type GreetingHeaderProps = {
  /** Profile first name when known (e.g. from server session); falls back to “there”. */
  firstName?: string | null;
  className?: string;
};

export function GreetingHeader({ firstName, className }: GreetingHeaderProps) {
  const [greeting, setGreeting] = useState<string | null>(null);
  const displayName = firstName?.trim() ? firstName.trim() : "there";

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()));
  }, []);

  const rootClass = className ? `mb-[var(--ds-space-4)] ${className}` : "mb-[var(--ds-space-4)]";

  return (
    <header className={rootClass}>
      <div className="min-h-[2.25rem]">
        {greeting != null ? (
          <h1 className="m-0 text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
            {greeting}, {displayName}
          </h1>
        ) : (
          <h1
            className="invisible m-0 text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]"
            aria-hidden
          >
            Good afternoon, {displayName}
          </h1>
        )}
      </div>
      <p className="m-0 mt-1 max-w-xl text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
        Choose a portfolio or project
      </p>
    </header>
  );
}
