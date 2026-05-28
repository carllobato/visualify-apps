"use client";

import { useState } from "react";
import { TodayTaskRow } from "@/components/today/TodayTaskRow";
import type { TodaySurfaceTask } from "@/lib/today-data";

const DEFAULT_VISIBLE_TASKS = 6;

type TodayTasksSectionProps = {
  tasks: TodaySurfaceTask[];
  focused: boolean;
  projectNamesById: Record<string, string>;
};

function TaskList({ tasks, projectNamesById }: { tasks: TodaySurfaceTask[]; projectNamesById: Record<string, string> }) {
  return (
    <ul className="flex flex-col divide-y divide-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] max-md:divide-y-0">
      {tasks.map((task) => {
        const projectId = task.projectId?.trim();
        const projectName = projectId && projectNamesById[projectId] ? projectNamesById[projectId] : null;

        return (
          <TodayTaskRow key={task.id} task={task} projectName={projectName} reason={task.reason} />
        );
      })}
    </ul>
  );
}

export function TodayTasksSection({ tasks, focused, projectNamesById }: TodayTasksSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, tasks.length - DEFAULT_VISIBLE_TASKS);
  const visibleTasks = expanded ? tasks : tasks.slice(0, DEFAULT_VISIBLE_TASKS);
  const showExpansionMeta = tasks.length > DEFAULT_VISIBLE_TASKS;

  return (
    <section className="os-today-primary flex flex-col gap-1.5">
      <h2 className="os-today-primary__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
        {focused ? "Today priorities" : "Top priorities"}
      </h2>
      <div className="os-today-primary__list">
        {tasks.length > 0 ? (
          <>
            <TaskList tasks={visibleTasks} projectNamesById={projectNamesById} />
            {showExpansionMeta ? (
              <div className="os-today-primary__expansion">
                <p className="os-today-primary__expansion-meta">
                  {expanded
                    ? `Showing all ${tasks.length} tasks`
                    : `Showing ${visibleTasks.length} of ${tasks.length} tasks`}
                </p>
                {!expanded && hiddenCount > 0 ? (
                  <button
                    type="button"
                    className="os-today-primary__more"
                    onClick={() => setExpanded(true)}
                  >
                    Show more
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="os-today-empty-state">
            <p className="os-today-empty-state__title text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
              {focused ? "No urgent priorities in this stream right now" : "No urgent priorities right now"}
            </p>
            <p className="os-today-empty-state__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
              {focused
                ? "Try another focus, or capture something in Inbox."
                : "New high-priority or due work will surface here."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
