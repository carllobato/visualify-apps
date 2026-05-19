import type { ReactNode } from "react";
import { railBrandTitleClass, shellPageHeaderRailRowClassName } from "./rail-row-classes";

function mergeClass(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Page title typography — matches {@link railBrandTitleClass} on the rail brand row. */
export const appShellPageTitleClassName = `m-0 text-[var(--ds-text-primary)] ${railBrandTitleClass}`;

export const appShellPageHeaderDescriptionClassName =
  "m-0 max-w-2xl text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]";

export type AppShellPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Right-side actions (e.g. primary CTA); stacks below the title block on narrow viewports. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Document page title aligned with the rail brand row (`pt-5` + 40px control height).
 * Pair with {@link AppShellScrollRegion} inset — do not add extra top padding on the page wrapper.
 */
export function AppShellPageHeader({ title, description, actions, className }: AppShellPageHeaderProps) {
  const titleRow = (
    <div className={shellPageHeaderRailRowClassName}>
      <h1 className={appShellPageTitleClassName}>{title}</h1>
    </div>
  );

  if (description == null && actions == null) {
    return <header className={className}>{titleRow}</header>;
  }

  return (
    <header
      className={mergeClass(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-2.5">
        {titleRow}
        {description != null ? (
          <p className={appShellPageHeaderDescriptionClassName}>{description}</p>
        ) : null}
      </div>
      {actions ?? null}
    </header>
  );
}
