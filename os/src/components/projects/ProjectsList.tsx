import Link from "next/link";
import {
  projectInitialGlyph,
  streamAccentColor,
  streamIconGlyph,
  streamLabelForProject,
} from "@/components/projects/project-display";
import type { OsProject } from "@/lib/os/projects-data";
import { osProjectDetailPath } from "@/lib/os-routes";
import type { OsStream } from "@/lib/os/streams-data";

type ProjectsListProps = {
  projects: OsProject[];
  streamsById: ReadonlyMap<string, OsStream>;
  loadFailed?: boolean;
};

export function ProjectsList({
  projects,
  streamsById,
  loadFailed = false,
}: ProjectsListProps) {
  if (loadFailed) {
    return (
      <div className="os-projects-empty os-projects-empty--error" role="alert">
        <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          Couldn&apos;t load projects
        </p>
        <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="os-projects-empty">
        <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          No projects yet
        </p>
        <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Add a project to hold related tasks and outcomes.
        </p>
      </div>
    );
  }

  return (
    <ul className="os-projects-list">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} streamsById={streamsById} />
      ))}
    </ul>
  );
}

function ProjectRow({
  project,
  streamsById,
}: {
  project: OsProject;
  streamsById: ReadonlyMap<string, OsStream>;
}) {
  const description = project.description?.trim();
  const stream = project.streamId ? streamsById.get(project.streamId) : undefined;
  const streamName = streamLabelForProject(project.streamId, streamsById);
  const accent = stream ? streamAccentColor(stream.color) : null;
  const icon = stream ? streamIconGlyph(stream) : projectInitialGlyph(project);

  return (
    <li className="os-projects-list__item">
      <Link
        href={osProjectDetailPath(project.id)}
        className="os-projects-row os-projects-row__link"
      >
        <div className="os-projects-row__leading">
          <span
            className="os-projects-row__icon"
            style={
              accent
                ? {
                    backgroundColor: `color-mix(in oklab, ${accent} 14%, var(--ds-surface))`,
                    color: accent,
                  }
                : undefined
            }
            aria-hidden
          >
            {icon}
          </span>
          {accent ? (
            <span
              className="os-projects-row__accent"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          ) : (
            <span className="os-projects-row__accent os-projects-row__accent--muted" aria-hidden />
          )}
        </div>
        <div className="os-projects-row__body">
          <p className="os-projects-row__name">{project.name}</p>
          {streamName ? <p className="os-projects-row__stream">{streamName}</p> : null}
          {description ? <p className="os-projects-row__description">{description}</p> : null}
        </div>
        <span className="os-projects-row__chevron" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}
