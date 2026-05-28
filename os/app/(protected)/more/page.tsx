import Link from "next/link";
import { OS_ROUTES } from "@/lib/os-routes";

export const dynamic = "force-dynamic";

export default function MorePage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-none flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <header className="mb-4 flex flex-col gap-1 max-md:px-3 max-md:pt-2">
        <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">More</p>
        <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
          Utilities
        </h1>
      </header>

      <section className="flex flex-col gap-2.5 max-md:gap-[0.375rem]" aria-label="Secondary utilities">
        <div className="rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
          <ul className="divide-y divide-[var(--ds-border)]">
            <li>
              <Link
                href={OS_ROUTES.allTasks}
                className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_70%,var(--ds-bg))] active:bg-[color-mix(in_oklab,var(--ds-surface)_58%,var(--ds-bg))]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--ds-text-primary)]">All Tasks</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[var(--ds-text-secondary)]">
                    Review and manage every active task across OS.
                  </span>
                </span>
                <span className="text-[var(--ds-text-muted)]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
            <li>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-[var(--ds-text-primary)]">Search</span>
                <span className="text-[var(--ds-text-muted)] text-xs">Soon</span>
              </div>
            </li>
            <li>
              <Link
                href={OS_ROUTES.decisions}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_70%,var(--ds-bg))] active:bg-[color-mix(in_oklab,var(--ds-surface)_58%,var(--ds-bg))]"
              >
                <span className="text-[var(--ds-text-primary)]">Decisions</span>
                <span className="text-[var(--ds-text-muted)]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
            <li>
              <Link
                href={OS_ROUTES.briefings}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_70%,var(--ds-bg))] active:bg-[color-mix(in_oklab,var(--ds-surface)_58%,var(--ds-bg))]"
              >
                <span className="text-[var(--ds-text-primary)]">Briefings</span>
                <span className="text-[var(--ds-text-muted)]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
            <li>
              <Link
                href={OS_ROUTES.settings}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_70%,var(--ds-bg))] active:bg-[color-mix(in_oklab,var(--ds-surface)_58%,var(--ds-bg))]"
              >
                <span className="text-[var(--ds-text-primary)]">Settings</span>
                <span className="text-[var(--ds-text-muted)]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
