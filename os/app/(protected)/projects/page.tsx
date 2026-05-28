import { redirect } from "next/navigation";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { fetchActiveProjectsWithStatusForUserId } from "@/lib/os/projects-data";
import { fetchActiveStreamsForUser } from "@/lib/os/streams-data";
import "./projects-mobile.css";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const [{ projects, loadFailed }, streams] = await Promise.all([
    fetchActiveProjectsWithStatusForUserId(userId),
    fetchActiveStreamsForUser(userId),
  ]);

  const streamsById = new Map(streams.map((stream) => [stream.id, stream]));

  return (
    <main className="os-projects-page mx-auto flex w-full min-w-0 max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] max-md:hidden">
        Projects
      </p>
      <p className="mt-1 max-w-prose text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)] max-md:hidden">
        Bounded efforts with clear outcomes — structured context for your work.
      </p>

      <div className="os-projects-feed mt-5 flex flex-col gap-5 sm:gap-6 max-md:mt-0 max-md:gap-2.5">
        <CreateProjectForm formKey={projects.length} streams={streams} />

        <section className="os-projects-list-section flex flex-col gap-2.5 max-md:gap-[0.375rem]">
          <h2 className="os-projects-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
            Your projects
          </h2>
          <div className="os-projects-surface">
            <ProjectsList
              projects={projects}
              streamsById={streamsById}
              loadFailed={loadFailed}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
