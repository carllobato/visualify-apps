import Link from "next/link";
import { OS_ROUTES } from "@/lib/os-routes";
import "../projects-mobile.css";

export default function ProjectDetailNotFound() {
  return (
    <main className="os-projects-page mx-auto flex w-full min-w-0 max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <Link
        href={OS_ROUTES.projects}
        className="os-projects-back text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] max-md:mx-3 max-md:mt-2"
      >
        ← Projects
      </Link>
      <div className="os-projects-feed mt-4 flex flex-col gap-3 max-md:mt-2">
        <div className="os-projects-surface os-projects-empty">
          <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
            Project not found
          </p>
          <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            It may have been archived, or the link is no longer valid.
          </p>
        </div>
      </div>
    </main>
  );
}
