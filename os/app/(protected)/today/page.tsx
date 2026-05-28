import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { TodayBriefingHero } from "@/components/today/TodayBriefingHero";
import { TodayStreamFilterBar } from "@/components/today/TodayStreamFilter";
import {
  fetchTodayPageData,
  filterTasksForTodaySurface,
  normalizeTodayPageData,
  type TodayTask,
} from "@/lib/today-data";
import {
  filterTasksByTodayStream,
  resolveTodayStreamFilter,
  type TodayStreamFilter,
} from "@/lib/today-stream-filter";
import { supabaseServerClient } from "@/lib/supabase/server";
import "./today-mobile.css";

export const dynamic = "force-dynamic";

const BRIEFING_PREVIEW_MAX_CHARS = 480;

function formatDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTodayHeading(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Humanize enum/snake values for read-only display (e.g. `high` → `High`, `daily` → `Daily`). */
function formatDisplayLabel(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function splitBriefingContent(content: string): { preview: string; remainder: string | null } {
  const trimmed = content.trim();
  if (!trimmed) return { preview: "", remainder: null };

  const paragraphs = trimmed.split(/\n\n+/);
  const firstParagraph = paragraphs[0] ?? trimmed;

  if (paragraphs.length > 1 && firstParagraph.length <= BRIEFING_PREVIEW_MAX_CHARS) {
    const remainder = paragraphs.slice(1).join("\n\n").trim();
    return { preview: firstParagraph, remainder: remainder || null };
  }

  if (trimmed.length <= BRIEFING_PREVIEW_MAX_CHARS) {
    return { preview: trimmed, remainder: null };
  }

  const slice = trimmed.slice(0, BRIEFING_PREVIEW_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const preview = (lastSpace > 280 ? slice.slice(0, lastSpace) : slice).trim();
  const remainder = trimmed.slice(preview.length).trim();
  return { preview, remainder: remainder || null };
}

function TaskRow({ task }: { task: TodayTask }) {
  return (
    <li className="os-today-row py-3 first:pt-0 last:pb-0 max-md:py-0">
      <div className="os-today-row__body">
        <p className="os-today-row__title break-words text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
          {task.title}
        </p>
      </div>
    </li>
  );
}

function TaskList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col divide-y divide-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] max-md:divide-y-0">
      {children}
    </ul>
  );
}

function TodayTasksCard({
  tasks,
  streamFilter,
}: {
  tasks: TodayTask[];
  streamFilter: TodayStreamFilter;
}) {
  const focused = streamFilter.kind === "stream";

  return (
    <section className="os-today-block os-today-tasks flex flex-col gap-2.5">
      <h2 className="os-today-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
        {focused ? "Tasks in focus" : "Today\u2019s tasks"}
      </h2>
      <div className="os-today-block__surface">
        {tasks.length > 0 ? (
          <TaskList>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </TaskList>
        ) : (
          <div className="os-today-empty-state">
            <p className="os-today-empty-state__title text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
              {focused
                ? "Nothing due in this stream today"
                : "Nothing scheduled for today"}
            </p>
            <p className="os-today-empty-state__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
              {focused
                ? "Try another focus, or capture something in Inbox."
                : "Use Inbox to capture anything new."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

type TodayPageProps = {
  searchParams: Promise<{ stream?: string | string[] }>;
};

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { stream: streamParam } = await searchParams;
  const pageData = normalizeTodayPageData(await fetchTodayPageData(user.id));
  const { tasks, streams, projects, latestBriefing } = pageData;

  const streamFilter = resolveTodayStreamFilter(streamParam, streams);
  const todaysTasks = filterTasksByTodayStream(
    filterTasksForTodaySurface(tasks),
    streamFilter,
    projects,
  );

  const { preview, remainder } = latestBriefing
    ? splitBriefingContent(latestBriefing.content)
    : { preview: "", remainder: null };

  const dateLabel = latestBriefing ? formatDateLabel(latestBriefing.briefingDate) : null;
  const typeLabel = latestBriefing ? formatDisplayLabel(latestBriefing.briefingType) : null;
  const metaLine = [dateLabel, typeLabel].filter(Boolean).join(" · ") || null;

  const heroTitle = latestBriefing?.title ?? formatTodayHeading();

  return (
    <main className="os-today-page mx-auto flex w-full min-w-0 max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] max-md:hidden">
        Today
      </p>

      <div className="os-today-feed mt-5 flex flex-col gap-6 sm:gap-7 max-md:mt-0 max-md:gap-2.5">
        <TodayStreamFilterBar streams={streams} activeFilter={streamFilter} />

        <TodayBriefingHero
          briefing={latestBriefing}
          title={heroTitle}
          metaLine={metaLine}
          previewBody={preview || null}
          previewRemainder={remainder}
        />

        <TodayTasksCard tasks={todaysTasks} streamFilter={streamFilter} />
      </div>
    </main>
  );
}
