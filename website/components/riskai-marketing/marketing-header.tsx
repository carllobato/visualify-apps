import Link from "next/link";
import { headerSignInClass, RISKAI_LOGIN_URL } from "@/components/riskai-marketing/constants";

export function MarketingHeader() {
  return (
    <header
      className={
        "ds-app-top-nav flex h-14 shrink-0 items-center justify-between gap-[var(--ds-space-3)] " +
        "border-b border-[color-mix(in_oklab,var(--ds-border-subtle)_65%,transparent)] bg-[var(--ds-app-document-bg)] " +
        "pl-[var(--ds-space-2)] pr-0 backdrop-blur-sm md:pr-[var(--ds-space-3)]"
      }
    >
      <div className="flex min-w-0 items-center gap-[var(--ds-space-3)]">
        <Link
          href="/"
          className="inline-flex h-9 items-center px-[var(--ds-space-2)] text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight text-[var(--ds-text-primary)] no-underline transition-colors hover:text-[var(--ds-text-secondary)]"
        >
          Visualify <span className="mx-1.5 font-normal">|</span> RiskAI
        </Link>
      </div>
      <div className="flex items-center gap-[var(--ds-space-2)]">
        <a href={RISKAI_LOGIN_URL} className={headerSignInClass} rel="noopener noreferrer" target="_blank">
          Sign in
        </a>
      </div>
    </header>
  );
}
