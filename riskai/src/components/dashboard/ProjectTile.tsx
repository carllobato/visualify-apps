import Link from "next/link";
import type { ProjectTilePayload } from "@/lib/dashboard/projectTileServerData";
import { riskaiPath } from "@/lib/routes";

function ragDotClass(status: ProjectTilePayload["ragStatus"]): string {
  switch (status) {
    case "green":
      return "bg-[var(--ds-risk-low)]";
    case "amber":
      return "bg-[var(--ds-risk-medium)]";
    case "red":
      return "bg-[var(--ds-risk-high)]";
    default:
      return "bg-[color-mix(in_oklab,var(--ds-text-muted)_72%,var(--ds-surface-default))]";
  }
}

/** Screen-reader only — matches dot semantics (no visible labels). */
function ragAriaFragment(status: ProjectTilePayload["ragStatus"]): string {
  switch (status) {
    case "green":
      return "Healthy.";
    case "amber":
      return "Watch.";
    case "red":
      return "At risk.";
    default:
      return "";
  }
}

function RagDot({ status }: { status: ProjectTilePayload["ragStatus"] }) {
  return (
    <span
      className={`size-2 shrink-0 rounded-full ${ragDotClass(status)}`}
      aria-hidden
    />
  );
}

/** Shared shell for dashboard project row tiles (project + new-project). Fixed height so rows align. */
export const PROJECT_TILE_LINK_CLASSES =
  "group flex h-14 items-center justify-between gap-3 self-start rounded-lg border border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] bg-[var(--ds-surface-elevated)] px-[1.125rem] shadow-[var(--ds-elevation-tile)] outline-none transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)] hover:shadow-[var(--ds-elevation-tile-hover)] dark:border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-background)]";

export type ProjectTileProps = {
  payload: ProjectTilePayload;
};

/** Distinct from project rows: dashed frame, tinted fill, emerald hover. */
const NEW_PROJECT_TILE_EXTRA_CLASSES =
  "border-dashed border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_60%,transparent)] hover:border-[var(--ds-risk-low-border)] hover:bg-[var(--ds-risk-low-soft-bg)] dark:border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_40%,transparent)] dark:hover:border-[var(--ds-risk-low-border)] dark:hover:bg-[color-mix(in_oklab,var(--ds-risk-low)_14%,var(--ds-surface-default))]";

export type NewProjectTileProps = {
  /** Default portfolio for `/create-project` when the user has several. */
  portfolioId?: string | null;
};

/**
 * Create-project tile: dashed card; + aligned right like the RAG dot on project rows.
 */
export function NewProjectTile({ portfolioId = null }: NewProjectTileProps) {
  const href =
    portfolioId != null && portfolioId !== ""
      ? `${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolioId)}`
      : riskaiPath("/create-project");

  return (
    <Link
      href={href}
      className={`${PROJECT_TILE_LINK_CLASSES} ${NEW_PROJECT_TILE_EXTRA_CLASSES}`}
      aria-label="Create a new project"
    >
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--ds-text-primary)]">
        New project
      </span>
      <span
        className="shrink-0 text-2xl font-light leading-none text-[var(--ds-text-primary)]"
        aria-hidden
      >
        +
      </span>
    </Link>
  );
}

/**
 * Minimal dashboard tile: project name with right-aligned RAG dot.
 */
export function ProjectTile({ payload }: ProjectTileProps) {
  const { id, name, ragStatus } = payload;
  const title = name?.trim() || id;

  return (
    <Link
      href={riskaiPath(`/projects/${id}`)}
      className={PROJECT_TILE_LINK_CLASSES}
      aria-label={`Open project ${title}. ${ragAriaFragment(ragStatus)}`}
    >
      <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--ds-text-primary)]">
        {title}
      </h3>
      <RagDot status={ragStatus} />
    </Link>
  );
}
