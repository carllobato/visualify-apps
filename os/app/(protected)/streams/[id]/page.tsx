import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArchiveStreamForm } from "@/components/streams/ArchiveStreamForm";
import { EditStreamForm } from "@/components/streams/EditStreamForm";
import { StreamDetailHeader } from "@/components/streams/StreamDetailHeader";
import { StreamRelatedWork } from "@/components/streams/StreamRelatedWork";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { fetchStreamRelatedWorkForUser } from "@/lib/os/stream-related-data";
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

  const [stream, relatedWork] = await Promise.all([
    fetchStreamByIdForUserId(userId, id),
    fetchStreamRelatedWorkForUser(userId, id),
  ]);

  if (!stream) {
    notFound();
  }

  if (stream.status === OS_STREAM_STATUS.archived) {
    redirect(OS_ROUTES.streams);
  }

  return (
    <main className="os-streams-page mx-auto flex w-full min-w-0 max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <Link
        href={OS_ROUTES.streams}
        className="os-streams-back text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] max-md:mx-3 max-md:mt-2 max-md:mb-0"
      >
        ← Streams
      </Link>

      <div className="os-streams-feed mt-4 flex flex-col gap-5 sm:gap-6 max-md:mt-2 max-md:gap-2.5">
        <StreamDetailHeader stream={stream} />

        <StreamRelatedWork work={relatedWork} />

        <div className="os-streams-manage flex flex-col gap-4 max-md:gap-3">
          <EditStreamForm stream={stream} />
          <ArchiveStreamForm streamId={stream.id} streamName={stream.name} />
        </div>
      </div>
    </main>
  );
}
