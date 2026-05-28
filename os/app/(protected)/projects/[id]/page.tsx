import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArchiveProjectForm } from "@/components/projects/ArchiveProjectForm";
import { EditProjectForm } from "@/components/projects/EditProjectForm";
import { ProjectDetailHeader } from "@/components/projects/ProjectDetailHeader";
import { ProjectDetailTabs } from "@/components/projects/ProjectDetailTabs";
import { ProjectLinkedStream } from "@/components/projects/ProjectLinkedStream";
import { ProjectTasksSection } from "@/components/projects/ProjectTasksSection";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import {
  OS_PROJECT_STATUS,
  fetchProjectByIdForUserId,
} from "@/lib/os/projects-data";
import { fetchActiveTasksForProjectForUserId } from "@/lib/os/tasks-data";
import { fetchActiveWaitingOnsForProjectForUserId } from "@/lib/os/waiting-ons-data";
import {
  fetchActiveStreamsForUser,
  fetchStreamByIdForUserId,
} from "@/lib/os/streams-data";
import { OS_ROUTES } from "@/lib/os-routes";
import "../projects-mobile.css";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const project = await fetchProjectByIdForUserId(userId, id);
  if (!project) {
    notFound();
  }

  if (project.status === OS_PROJECT_STATUS.archived) {
    redirect(OS_ROUTES.projects);
  }

  const [
    stream,
    streams,
    { tasks, loadFailed: tasksLoadFailed },
    { waitingOns, loadFailed: waitingOnsLoadFailed },
  ] = await Promise.all([
    project.streamId != null
      ? fetchStreamByIdForUserId(userId, project.streamId)
      : Promise.resolve(null),
    fetchActiveStreamsForUser(userId),
    fetchActiveTasksForProjectForUserId(userId, project.id),
    fetchActiveWaitingOnsForProjectForUserId(userId, project.id),
  ]);

  return (
    <main className="os-projects-page flex w-full min-w-0 max-w-none flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <Link
        href={OS_ROUTES.projects}
        className="os-projects-back text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] max-md:mx-3 max-md:mt-2 max-md:mb-0"
      >
        ← Projects
      </Link>

      <div className="os-projects-feed mt-4 flex flex-col gap-5 sm:gap-6 max-md:mt-2 max-md:gap-2.5">
        <ProjectDetailHeader project={project} />

        <ProjectDetailTabs
          workPanel={
            <>
              {stream ? <ProjectLinkedStream stream={stream} /> : null}
              <ProjectTasksSection
                projectId={project.id}
                streamId={project.streamId}
                tasks={tasks}
                waitingOns={waitingOns}
                tasksLoadFailed={tasksLoadFailed}
                waitingOnsLoadFailed={waitingOnsLoadFailed}
              />
            </>
          }
          kanbanPanel={
            <ProjectTasksSection
              projectId={project.id}
              streamId={project.streamId}
              tasks={tasks}
              waitingOns={waitingOns}
              tasksLoadFailed={tasksLoadFailed}
              waitingOnsLoadFailed={waitingOnsLoadFailed}
              initialViewMode="board"
              hideViewToggle
              boardFirstLayout
            />
          }
          managePanel={
            <div className="os-projects-manage flex flex-col gap-4 max-md:gap-3">
              <EditProjectForm project={project} streams={streams} />
              <ArchiveProjectForm projectId={project.id} projectName={project.name} />
            </div>
          }
        />
      </div>
    </main>
  );
}
