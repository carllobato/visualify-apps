/**
 * Shared 404 UI. Used by app/not-found.tsx and the catch-all route so the
 * same content is shown whether notFound() is called or an invalid URL is hit.
 * Plain <a> links so navigation away does a full page load and layout remounts.
 */
export function NotFoundContent() {
  return (
    <main className="min-h-[40vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">
          404 – Page not found
        </h1>
        <p className="text-sm text-[var(--ds-text-secondary)]">
          The page you're looking for doesn't exist. Use the links below to
          reload the app.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] no-underline"
          >
            Home
          </a>
          <a
            href="/riskai/projects"
            className="px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-subtle-bg)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)] no-underline"
          >
            Projects
          </a>
        </div>
      </div>
    </main>
  );
}
