import type { OsProject } from "@/lib/os/projects-data";
import { projectInitialGlyph, projectStatusLabel } from "@/components/projects/project-display";

export function ProjectDetailHeader({ project }: { project: OsProject }) {
  const description = project.description?.trim();
  const statusLabel = projectStatusLabel(project.status);

  return (
    <header className="os-projects-detail-hero os-projects-surface">
      <div className="os-projects-detail-hero__identity">
        <span className="os-projects-detail-hero__icon" aria-hidden>
          {projectInitialGlyph(project)}
        </span>
        <div className="os-projects-detail-hero__text">
          <div className="os-projects-detail-hero__title-row">
            <h1 className="os-projects-detail-hero__name">{project.name}</h1>
          </div>
          <p className="os-projects-detail-hero__status">
            <span className="os-projects-detail-hero__status-label">Status</span>
            <span className="os-projects-detail-hero__status-value">{statusLabel}</span>
          </p>
        </div>
      </div>
      {description ? (
        <p className="os-projects-detail-hero__description">{description}</p>
      ) : null}
    </header>
  );
}
