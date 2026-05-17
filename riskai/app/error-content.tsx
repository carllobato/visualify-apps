"use client";

type ErrorContentProps = {
  onRetry?: () => void;
  digest?: string;
};

/**
 * Shared error UI for `app/error.tsx` and segment error boundaries.
 */
export function ErrorContent({ onRetry, digest }: ErrorContentProps) {
  return (
    <main className="min-h-[40vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">Something went wrong</h1>
        <p className="text-sm text-[var(--ds-text-secondary)]">
          The page could not be loaded. Try again, or return home. If you just changed code, wait for the dev
          server to finish compiling and refresh.
        </p>
        {digest ? (
          <p className="text-xs text-[var(--ds-text-muted)]" aria-live="polite">
            Reference: {digest}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-subtle-bg)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
            >
              Try again
            </button>
          ) : null}
          <a
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] no-underline"
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
