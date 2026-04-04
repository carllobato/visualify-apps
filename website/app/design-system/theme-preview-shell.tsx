"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function ThemePreviewShell({
  lightContent,
  darkContent,
}: {
  lightContent: ReactNode;
  darkContent: ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className="visualify-ds-root min-h-dvh">
      <div data-theme={isDark ? "dark" : undefined} className="min-h-dvh bg-[var(--ds-canvas)]">
        <div className="flex min-h-dvh w-full flex-col px-5 py-9 sm:px-7 sm:py-11 lg:px-10">
          <div className="sticky top-4 z-20 mb-7 flex items-center justify-between rounded-[var(--ds-radius-md)] border border-[var(--ds-border-app-frame)] bg-[var(--ds-app-document-bg)] px-4 py-3 shadow-[var(--ds-shadow-sm)] sm:px-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--ds-muted-foreground)] opacity-[0.8]">
              Theme preview
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--ds-muted-foreground)]">Light</span>
              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border border-[var(--ds-border)] transition-colors duration-200 ease-out ${
                  isDark ? "bg-[var(--ds-primary)]" : "bg-[var(--ds-muted)]"
                }`}
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle dark mode preview"
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                    isDark ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs font-medium text-[var(--ds-muted-foreground)]">Dark</span>
            </div>
          </div>

          <div className="w-full flex-1">{isDark ? darkContent : lightContent}</div>
        </div>
      </div>
    </div>
  );
}
