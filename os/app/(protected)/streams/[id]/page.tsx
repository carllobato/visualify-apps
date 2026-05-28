import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountSettingsTabs } from "@visualify/app-shell";
import { ArchiveStreamForm } from "@/components/streams/ArchiveStreamForm";
import { EditStreamForm } from "@/components/streams/EditStreamForm";
import { StreamDetailHeader } from "@/components/streams/StreamDetailHeader";
import { StreamProjectsList } from "@/components/streams/StreamProjectsList";
import { StreamRelatedWork } from "@/components/streams/StreamRelatedWork";
import { StreamTaskKanban } from "@/components/streams/StreamTaskKanban";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import {
  fetchAllProjectsForStreamForUser,
  fetchAllTasksForStreamForUser,
  fetchStreamRelatedWorkForUser,
} from "@/lib/os/stream-related-data";
import { OS_STREAM_STATUS, fetchStreamByIdForUserId } from "@/lib/os/streams-data";
import { OS_ROUTES } from "@/lib/os-routes";
import "../streams-mobile.css";

export const dynamic = "force-dynamic";

type StreamDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StreamDetailPage({ params }: StreamDetailPageProps) {
  const { id } = await params;
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const [stream, relatedWork, streamTasks, streamProjects] = await Promise.all([
    fetchStreamByIdForUserId(userId, id),
    fetchStreamRelatedWorkForUser(userId, id),
    fetchAllTasksForStreamForUser(userId, id),
    fetchAllProjectsForStreamForUser(userId, id),
  ]);

  if (!stream) {
    notFound();
  }

  if (stream.status === OS_STREAM_STATUS.archived) {
    redirect(OS_ROUTES.streams);
  }

  return (
    <main className="os-streams-page mx-auto flex w-full min-w-0 max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <Link
        href={OS_ROUTES.streams}
        className="os-streams-back text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] max-md:mx-3 max-md:mt-2 max-md:mb-0"
      >
        ← Streams
      </Link>

      <div className="os-streams-feed mt-4 flex flex-col gap-5 sm:gap-6 max-md:mt-2 max-md:gap-2.5">
        <StreamDetailHeader stream={stream} />

        <AccountSettingsTabs
          tabs={[
            {
              id: "related-work",
              label: "Related work",
              panel: <StreamRelatedWork work={relatedWork} />,
            },
            {
              id: "manage",
              label: "Manage",
              panel: (
                <div className="flex flex-col gap-4 max-md:gap-3">
                  <EditStreamForm stream={stream} />
                  <ArchiveStreamForm streamId={stream.id} streamName={stream.name} />
                </div>
              ),
            },
            {
              id: "kanban",
              label: "Kanban",
              panel: <StreamTaskKanban tasks={streamTasks} />,
            },
            {
              id: "projects",
              label: "Projects",
              panel: <StreamProjectsList projects={streamProjects} />,
            },
          ]}
          initialTabId="related-work"
        />
      </div>
    </main>
  );
}
