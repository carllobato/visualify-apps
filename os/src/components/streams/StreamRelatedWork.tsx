import type { ReactNode } from "react";
import type { StreamRelatedWork as StreamRelatedWorkData } from "@/lib/os/stream-related-data";
import { streamRelatedWorkIsEmpty } from "@/lib/os/stream-related-data";
import {
  formatTaskMetaLine,
  formatWaitingOnMetaLine,
} from "@/components/streams/stream-related-format";

export function StreamRelatedWork({ work }: { work: StreamRelatedWorkData }) {
  if (streamRelatedWorkIsEmpty(work)) {
    return (
      <section
        className="os-streams-related flex flex-col gap-2.5 max-md:gap-[0.375rem]"
        aria-labelledby="os-streams-related-heading"
      >
        <h2
          id="os-streams-related-heading"
          className="os-streams-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
        >
          Related work
        </h2>
        <div className="os-streams-surface os-streams-related-empty">
          <p className="os-streams-related-empty__text text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
            This stream has no linked work yet.
          </p>
          <p className="os-streams-related-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            Items appear when they use this stream, or belong to a project in this stream.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="os-streams-related flex flex-col gap-4 max-md:gap-2.5"
      aria-labelledby="os-streams-related-heading"
    >
      <h2
        id="os-streams-related-heading"
        className="os-streams-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        Related work
      </h2>

      <div className="os-streams-related-sections flex flex-col gap-4 max-md:gap-2.5">
        {work.projects.length > 0 ? (
          <StreamRelatedSection title="Projects" count={work.projects.length}>
            <ul className="os-streams-related-list">
              {work.projects.map((project) => {
                const description = project.description?.trim();
                return (
                  <li key={project.id} className="os-streams-related-row">
                    <p className="os-streams-related-row__title">{project.name}</p>
                    {description ? (
                      <p className="os-streams-related-row__meta">{description}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </StreamRelatedSection>
        ) : null}

        {work.tasks.length > 0 ? (
          <StreamRelatedSection title="Tasks" count={work.tasks.length}>
            <ul className="os-streams-related-list">
              {work.tasks.map((task) => {
                const meta = formatTaskMetaLine(task);
                return (
                  <li key={task.id} className="os-streams-related-row">
                    <p className="os-streams-related-row__title">{task.title}</p>
                    {meta ? <p className="os-streams-related-row__meta">{meta}</p> : null}
                  </li>
                );
              })}
            </ul>
          </StreamRelatedSection>
        ) : null}

        {work.waitingOns.length > 0 ? (
          <StreamRelatedSection title="Waiting on" count={work.waitingOns.length}>
            <ul className="os-streams-related-list">
              {work.waitingOns.map((item) => {
                const meta = formatWaitingOnMetaLine(item);
                return (
                  <li key={item.id} className="os-streams-related-row">
                    <p className="os-streams-related-row__title">{item.title}</p>
                    {meta ? <p className="os-streams-related-row__meta">{meta}</p> : null}
                  </li>
                );
              })}
            </ul>
          </StreamRelatedSection>
        ) : null}
      </div>
    </section>
  );
}

function StreamRelatedSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="os-streams-related-section flex flex-col gap-[0.375rem]">
      <h3 className="os-streams-related-section__label">
        {title}
        <span className="os-streams-related-section__count">{count}</span>
      </h3>
      <div className="os-streams-surface">{children}</div>
    </section>
  );
}
