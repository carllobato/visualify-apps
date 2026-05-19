import { AppShellPageHeader } from "@visualify/app-shell";
import Link from "next/link";

export function EntityAdminNoAccess({ pageTitle }: { pageTitle: string }) {
  return (
    <div className="flex min-h-full flex-col items-start justify-start px-0 pb-10 pt-0">
      <main className="w-full max-w-md shrink-0 space-y-4">
        <AppShellPageHeader
          title={pageTitle}
          description="You do not manage a Visualify workspace for this area yet."
        />
        <Link
          href="/account"
          className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
        >
          User Settings
        </Link>
      </main>
    </div>
  );
}
