import Link from "next/link";
import { DashboardAccountMenu } from "./dashboard/dashboard-account-menu";

/** Fixed top navigation shared by HQ signed-in routes (dashboard, account, …). */
export function AppHeader() {
  return (
    <div className="fixed inset-x-0 top-0 z-20">
      <header className="ds-app-top-nav flex h-14 shrink-0 items-center justify-between gap-[var(--ds-space-3)] px-[var(--ds-space-2)]">
        <div className="flex min-w-0 items-center gap-[var(--ds-space-3)]">
          <Link
            href="/"
            className="inline-flex h-9 items-center px-[var(--ds-space-2)] text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight text-[var(--ds-text-primary)] no-underline transition-colors hover:text-[var(--ds-text-secondary)]"
          >
            Visualify
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-[var(--ds-space-2)]">
          <DashboardAccountMenu />
        </div>
      </header>
    </div>
  );
}
