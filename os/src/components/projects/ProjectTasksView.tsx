"use client";

import { useState } from "react";
import { ProjectTaskBoard } from "@/components/projects/ProjectTaskBoard";
import { ProjectTaskCreateForm } from "@/components/projects/ProjectTaskCreateForm";
import { ProjectTaskList } from "@/components/projects/ProjectTaskList";
import type { OsTask } from "@/lib/os/tasks-data";
import type { OsWaitingOn } from "@/lib/os/waiting-ons-data";

type TasksViewMode = "list" | "board";

type ProjectTasksViewProps = {
  projectId: string;
  streamId: string | null;
  /** Changes after a successful create so the form resets. */
  formKey: number;
  tasks: OsTask[];
  waitingOns: OsWaitingOn[];
  tasksLoadFailed?: boolean;
  waitingOnsLoadFailed?: boolean;
  initialViewMode?: TasksViewMode;
  hideViewToggle?: boolean;
  boardFirstLayout?: boolean;
};

export function ProjectTasksView({
  projectId,
  streamId,
  formKey,
  tasks,
  waitingOns,
  tasksLoadFailed = false,
  waitingOnsLoadFailed = false,
  initialViewMode = "list",
  hideViewToggle = false,
  boardFirstLayout = false,
}: ProjectTasksViewProps) {
  const [viewMode, setViewMode] = useState<TasksViewMode>(initialViewMode);
  const showBoardFirst = boardFirstLayout && viewMode === "board";

  return (
    <div className="os-projects-tasks-view flex flex-col gap-2.5 max-md:gap-[0.375rem]">
      <div className="os-projects-tasks-header">
        <h2
          id="os-projects-tasks-heading"
          className="os-projects-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
        >
          Tasks
        </h2>
        {!hideViewToggle ? (
          <div
            className="os-projects-tasks-view-toggle"
            role="tablist"
            aria-label="Task view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "list"}
              className={`os-projects-tasks-view-toggle__btn${viewMode === "list" ? " os-projects-tasks-view-toggle__btn--active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "board"}
              className={`os-projects-tasks-view-toggle__btn${viewMode === "board" ? " os-projects-tasks-view-toggle__btn--active" : ""}`}
              onClick={() => setViewMode("board")}
            >
              Board
            </button>
          </div>
        ) : null}
      </div>

      {showBoardFirst ? (
        <>
          <div className="os-projects-surface os-projects-task-list-section os-projects-task-list-section--board">
            <ProjectTaskBoard
              tasks={tasks}
              waitingOns={waitingOns}
              tasksLoadFailed={tasksLoadFailed}
              waitingOnsLoadFailed={waitingOnsLoadFailed}
            />
          </div>
          <ProjectTaskCreateForm
            projectId={projectId}
            streamId={streamId}
            formKey={formKey}
          />
        </>
      ) : (
        <>
          <ProjectTaskCreateForm
            projectId={projectId}
            streamId={streamId}
            formKey={formKey}
          />
          <div
            className={`os-projects-surface os-projects-task-list-section${viewMode === "board" ? " os-projects-task-list-section--board" : ""}`}
          >
            {viewMode === "list" ? (
              <ProjectTaskList
                tasks={tasks}
                waitingOns={waitingOns}
                tasksLoadFailed={tasksLoadFailed}
                waitingOnsLoadFailed={waitingOnsLoadFailed}
              />
            ) : (
              <ProjectTaskBoard
                tasks={tasks}
                waitingOns={waitingOns}
                tasksLoadFailed={tasksLoadFailed}
                waitingOnsLoadFailed={waitingOnsLoadFailed}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
