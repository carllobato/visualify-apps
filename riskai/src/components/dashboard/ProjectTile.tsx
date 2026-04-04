import Link from "next/link";
import type { ProjectTilePayload } from "@/lib/dashboard/projectTileServerData";
import { riskaiPath } from "@/lib/routes";

function ragDotClass(status: ProjectTilePayload["ragStatus"]): string {
  switch (status) {
    case "green":
      return "bg-[var(--ds-status-success)]";
    case "amber":
      return "bg-[var(--ds-status-warning)]";
    case "red":
      return "bg-[var(--ds-status-danger)]";
    default:
      return "bg-[var(--ds-status-neutral)]";
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
      className={`size-[0.6875rem] shrink-0 rounded-full ${ragDotClass(status)}`}
      aria-hidden
    />
  );
}

/** Borderless row tile: surface tone + elevation; `self-start` for grid cells, `w-full` for vertical lists. */
export const PROJECT_TILE_LINK_BASE =
  "group flex h-14 items-center justify-between gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-tile)] px-[1.125rem] text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-tile)] outline-none transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-[var(--ds-surface-tile-hover)] hover:shadow-[var(--ds-elevation-tile-hover)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-app-document-bg)]";

export const PROJECT_TILE_LINK_CLASSES = `${PROJECT_TILE_LINK_BASE} self-start`;

/** Same tile shell as {@link PROJECT_TILE_LINK_CLASSES} for full-width list rows (portfolios, project lists). */
export const PROJECT_TILE_LIST_LINK_CLASSES = `${PROJECT_TILE_LINK_BASE} w-full`;

/** Right “+” on create-row links (aligned like project row affordances). */
export const CREATE_ROW_PLUS_GLYPH_CLASSES =
  "shrink-0 text-2xl font-light leading-none text-[var(--ds-text-primary)]";

/**
 * Create-project placeholder row: same flex shell as {@link PROJECT_TILE_LINK_BASE}; resting flat (`shadow-none`);
 * hover uses create surfaces + lighter `--ds-elevation-row-create-hover` (weaker lift than standard tiles).
 */
export const NEW_PROJECT_TILE_LINK_BASE =
  "group flex h-14 items-center justify-between gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-row-create)] px-[1.125rem] text-[var(--ds-text-primary)] shadow-none outline-none transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-[var(--ds-surface-row-create-hover)] hover:shadow-[var(--ds-elevation-row-create-hover)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-app-document-bg)]";

export const NEW_PROJECT_TILE_LINK_CLASSES = `${NEW_PROJECT_TILE_LINK_BASE} self-start`;

export const NEW_PROJECT_TILE_LIST_LINK_CLASSES = `${NEW_PROJECT_TILE_LINK_BASE} w-full`;

export type ProjectTileProps = {
  payload: ProjectTilePayload;
};

export type NewProjectTileProps = {
  /** Default portfolio for `/create-project` when the user has several. */
  portfolioId?: string | null;
};

/**
 * Create-project tile: muted surface (no border); + aligned right like the RAG dot on project rows.
 */
export function NewProjectTile({ portfolioId = null }: NewProjectTileProps) {
  const href =
    portfolioId != null && portfolioId !== ""
      ? `${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolioId)}`
      : riskaiPath("/create-project");

  return (
    <Link
      href={href}
      className={NEW_PROJECT_TILE_LINK_CLASSES}
      aria-label="Create project"
    >
      <span className="min-w-0 flex-1 truncate text-[length:var(--ds-text-sm)] font-semibold leading-tight tracking-tight text-[var(--ds-text-primary)]">
        Create project
      </span>
      <span className={CREATE_ROW_PLUS_GLYPH_CLASSES} aria-hidden>
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
      <h3 className="min-w-0 flex-1 truncate text-[length:var(--ds-text-sm)] font-semibold leading-tight tracking-tight text-[var(--ds-text-primary)]">
        {title}
      </h3>
      <RagDot status={ragStatus} />
    </Link>
  );
}
