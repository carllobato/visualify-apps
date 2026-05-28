import { ProjectTasksView } from "@/components/projects/ProjectTasksView";
import type { OsTask } from "@/lib/os/tasks-data";

type ProjectTasksSectionProps = {
  projectId: string;
  streamId: string | null;
  tasks: OsTask[];
  loadFailed?: boolean;
};

export function ProjectTasksSection({
  projectId,
  streamId,
  tasks,
  loadFailed = false,
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
        loadFailed={loadFailed}
        formKey={tasks.length}
      />
    </section>
  );
}
