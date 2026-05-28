import Link from "next/link";
import type { StreamRelatedProject } from "@/lib/os/stream-related-data";
import { osProjectDetailPath } from "@/lib/os-routes";

type StreamProjectsListProps = {
  projects: StreamRelatedProject[];
};

export function StreamProjectsList({ projects }: StreamProjectsListProps) {
  if (projects.length === 0) {
    return (
      <div className="os-streams-empty">
        <p className="os-streams-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          No active projects in this stream
        </p>
        <p className="os-streams-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Projects appear here when they are assigned to this stream.
        </p>
      </div>
    );
  }

  return (
    <div className="os-streams-surface">
      <ul className="os-streams-related-list">
        {projects.map((project) => {
          const description = project.description?.trim();
          return (
            <li key={project.id} className="os-streams-related-row">
              <Link href={osProjectDetailPath(project.id)} className="os-streams-related-row__link">
                <p className="os-streams-related-row__title">{project.name}</p>
                {description ? <p className="os-streams-related-row__meta">{description}</p> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
