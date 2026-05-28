import { redirect } from "next/navigation";
import { AccountSettingsTabs } from "@visualify/app-shell";
import { DefaultStreamsSeededNotice } from "@/components/streams/DefaultStreamsSeededNotice";
import { CreateStreamForm } from "@/components/streams/CreateStreamForm";
import { StreamsList } from "@/components/streams/StreamsList";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { ensureDefaultStreamsForUser } from "@/lib/os/seed-default-streams";
import { fetchActiveStreamsWithStatus } from "@/lib/os/streams-data";
import "./streams-mobile.css";

export const dynamic = "force-dynamic";
// Temporary QA guard: keep false while testing truly empty-stream onboarding.
const ENABLE_DEFAULT_STREAM_AUTO_SEEDING = false;

export default async function StreamsPage() {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const { seeded: defaultsSeeded } = ENABLE_DEFAULT_STREAM_AUTO_SEEDING
    ? await ensureDefaultStreamsForUser(userId)
    : { seeded: false };
  const { streams, loadFailed } = await fetchActiveStreamsWithStatus();

  return (
    <main className="os-streams-page mx-auto flex w-full min-w-0 max-w-none flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] max-md:hidden">
        Streams
      </p>
      <p className="mt-1 max-w-prose text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)] max-md:hidden">
        Directional threads across your work and life.
      </p>

      <div className="os-streams-feed mt-5 flex flex-col gap-5 sm:gap-6 max-md:mt-0 max-md:gap-2.5">
        <AccountSettingsTabs
          tabs={[
            {
              id: "list",
              label: "Your streams",
              panel: (
                <section className="os-streams-list-section flex flex-col gap-2.5 max-md:gap-[0.375rem]">
                  {defaultsSeeded ? <DefaultStreamsSeededNotice /> : null}
                  <div className="os-streams-surface">
                    <StreamsList streams={streams} loadFailed={loadFailed} />
                  </div>
                </section>
              ),
            },
            {
              id: "create",
              label: "New stream",
              panel: <CreateStreamForm formKey={streams.length} />,
            },
          ]}
          initialTabId="list"
        />
      </div>
    </main>
  );
}
