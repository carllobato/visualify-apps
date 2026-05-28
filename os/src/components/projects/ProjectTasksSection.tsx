import { ProjectTasksView } from "@/components/projects/ProjectTasksView";
import type { OsTask } from "@/lib/os/tasks-data";
import type { OsWaitingOn } from "@/lib/os/waiting-ons-data";

type ProjectTasksSectionProps = {
  projectId: string;
  streamId: string | null;
  tasks: OsTask[];
  waitingOns: OsWaitingOn[];
  tasksLoadFailed?: boolean;
  waitingOnsLoadFailed?: boolean;
  initialViewMode?: "list" | "board";
  hideViewToggle?: boolean;
  boardFirstLayout?: boolean;
};

export function ProjectTasksSection({
  projectId,
  streamId,
  tasks,
  waitingOns,
  tasksLoadFailed = false,
  waitingOnsLoadFailed = false,
  initialViewMode = "list",
  hideViewToggle = false,
  boardFirstLayout = false,
}: ProjectTasksSectionProps) {
  return (
    <section
      className="os-projects-tasks flex flex-col gap-2.5 max-md:gap-[0.375rem]"
      aria-labelledby="os-projects-tasks-heading"
    >
      <ProjectTasksView
        projectId={projectId}
        streamId={streamId}
        tasks={tasks}
        waitingOns={waitingOns}
        tasksLoadFailed={tasksLoadFailed}
        waitingOnsLoadFailed={waitingOnsLoadFailed}
        initialViewMode={initialViewMode}
        hideViewToggle={hideViewToggle}
        boardFirstLayout={boardFirstLayout}
        formKey={tasks.length}
      />
    </section>
  );
}
