import { redirect } from "next/navigation";
import { MorningBriefVoice } from "@/components/today/MorningBriefVoice";
import { TodayStreamFilterBar } from "@/components/today/TodayStreamFilter";
import { TodayTasksSection } from "@/components/today/TodayTasksSection";
import { TodayWeatherChip } from "@/components/today/TodayWeatherChip";
import { TodayWaitingOnsCard } from "@/components/today/TodayWaitingOnsCard";
import {
  fetchTodayPageData,
  normalizeTodayPageData,
  selectTasksForTodaySurface,
  type TodaySurfaceTask,
} from "@/lib/today-data";
import {
  filterWaitingOnsByTodayStream,
  filterTasksByTodayStream,
  resolveTodayStreamFilter,
  type TodayStreamFilter,
} from "@/lib/today-stream-filter";
import { supabaseServerClient } from "@/lib/supabase/server";
import "./today-mobile.css";

export const dynamic = "force-dynamic";

const WAITING_ONS_VISIBLE_LIMIT = 4;

function formatTodayHeading(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTodayLede(streamFilter: TodayStreamFilter): string {
  if (streamFilter.kind === "stream") {
    return `Priorities and follow-ups for ${streamFilter.stream.name}.`;
  }
  return "Priorities and follow-ups across your active streams.";
}

function formatWeekday(): string {
  return new Date().toLocaleDateString(undefined, { weekday: "long" });
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value.trim());
  }
  return output;
}

function isSeededOrTestBriefing(briefing: { title: string; content: string } | null): boolean {
  if (!briefing) return false;

  const haystack = `${briefing.title}\n${briefing.content}`.toLowerCase();
  const seededPhrases = [
    "seeded for layout check",
    "existing vectors and projects should list unchanged",
    "ship os today validation",
  ];

  return seededPhrases.some((phrase) => haystack.includes(phrase));
}

function buildFallbackSpokenBrief(input: {
  topTask: TodaySurfaceTask | null;
  surfacedTasks: TodaySurfaceTask[];
  topWaitingOn: { title: string; waitingOnName: string | null; projectName: string | null } | null;
  weatherOpener: string | null;
  streamFilter: TodayStreamFilter;
}): string {
  const { topTask, surfacedTasks, topWaitingOn, weatherOpener, streamFilter } = input;
  const weekday = formatWeekday();
  const openerCore = weatherOpener?.trim()
    ? `It's ${weatherOpener.trim()} on ${weekday}.`
    : `It's ${weekday} morning.`;
  const intro =
    streamFilter.kind === "stream"
      ? `${openerCore} In ${streamFilter.stream.name}, keep today focused.`
      : `${openerCore} Keep today focused and steady.`;

  const overdueCount = surfacedTasks.filter((task) => task.reason === "overdue").length;
  const criticalCount = surfacedTasks.filter((task) => task.reason === "critical").length;
  const focusLine =
    overdueCount > 0
      ? "The key move is to clear overdue pressure early and protect momentum."
      : criticalCount > 0
        ? "The day is about steady progress on your highest-priority work."
        : topTask
          ? "The day is mostly about keeping momentum on your active priorities."
          : "The day looks open enough to make calm progress.";

  const blockerLine = topWaitingOn
    ? "One dependency is still pending, but it should not block execution."
    : "Keep one dependency visible, then return to execution.";

  return `Good morning. ${intro} ${focusLine} ${blockerLine} Focus on clearing one meaningful priority early, then keep the day steady.`;
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
  const { tasks, waitingOns, streams, projects, latestBriefing } = pageData;

  const streamFilter = resolveTodayStreamFilter(streamParam, streams);
  const streamFilteredTasks = filterTasksByTodayStream(tasks, streamFilter, projects);
  const todaysTasks = selectTasksForTodaySurface(streamFilteredTasks);
  const filteredWaitingOns = filterWaitingOnsByTodayStream(waitingOns, streamFilter, projects);
  const projectNamesById = Object.fromEntries(
    projects.map((project) => [project.id, project.name]),
  );
  const streamNamesById = Object.fromEntries(streams.map((stream) => [stream.id, stream.name]));

  const topTask =
    todaysTasks.find((task) => task.reason === "overdue" || task.reason === "critical") ??
    todaysTasks[0] ??
    null;
  const topWaitingOn =
    filteredWaitingOns.find((item) => item.expectedResponseAt) ??
    filteredWaitingOns[0] ??
    null;
  const topWaitingOnProjectName =
    topWaitingOn?.projectId && projectNamesById[topWaitingOn.projectId]
      ? projectNamesById[topWaitingOn.projectId]
      : null;
  const fallbackSpokenBrief = buildFallbackSpokenBrief({
    topTask,
    surfacedTasks: todaysTasks,
    topWaitingOn: topWaitingOn
      ? {
          title: topWaitingOn.title,
          waitingOnName: topWaitingOn.waitingOnName,
          projectName: topWaitingOnProjectName,
        }
      : null,
    weatherOpener: null,
    streamFilter,
  });

  const effectiveBriefing = isSeededOrTestBriefing(latestBriefing) ? null : latestBriefing;
  const spokenBriefText = effectiveBriefing?.content?.trim() || fallbackSpokenBrief;
  const heading = formatTodayHeading();
  const lede = formatTodayLede(streamFilter);

  return (
    <main className="os-today-page flex w-full min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <header className="os-today-page__intro">
        <p className="os-today-page__eyebrow">Today</p>
        <h1 className="os-today-page__title">{heading}</h1>
        <p className="os-today-page__lede">{lede}</p>
      </header>

      <div className="os-today-feed mt-5 flex flex-col gap-6 sm:gap-7 max-md:mt-0 max-md:gap-2.5">
        <TodayStreamFilterBar streams={streams} activeFilter={streamFilter} />

        <section className="os-today-header">
          <div className="os-today-header__title-row">
            <h2 className="os-today-header__title">Plan for now</h2>
            <MorningBriefVoice text={spokenBriefText} className="shrink-0" />
          </div>
          <div className="os-today-header__meta-row">
            <TodayWeatherChip />
          </div>
        </section>

        <section className="os-today-unified-surface">
          <TodayTasksSection
            tasks={todaysTasks}
            focused={streamFilter.kind === "stream"}
            projectNamesById={projectNamesById}
          />

          <TodayWaitingOnsCard
            waitingOns={filteredWaitingOns}
            visibleLimit={WAITING_ONS_VISIBLE_LIMIT}
            streamFilter={streamFilter}
            projectNamesById={projectNamesById}
            streamNamesById={streamNamesById}
            embedded
          />
        </section>
      </div>
    </main>
  );
}
