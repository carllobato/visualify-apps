import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  fetchTodayPageData,
  normalizeTodayPageData,
  type TodayBriefing,
  type TodayProject,
  type TodayTask,
  type TodayStream,
  type TodayWaitingOn,
} from "@/lib/today-data";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FOCUS_LIST_LIMIT = 5;
const BRIEFING_PREVIEW_MAX_CHARS = 480;

function formatDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const MS_PER_LOCAL_DAY = 86_400_000;

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Calendar-day distance from today (local) to the target instant. */
function calendarDaysFromToday(iso: string): number | null {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = startOfLocalDayMs(target) - startOfLocalDayMs(new Date());
  return Math.round(diffMs / MS_PER_LOCAL_DAY);
}

type OperationalDateKind = "due" | "expected";

/**
 * Relative operational date for task due / waiting-on expected response.
 * Falls back to `Due {date}` / `Expected {date}` when the ISO value is not day-relative.
 */
function formatOperationalDateMeta(iso: string | null, kind: OperationalDateKind): string | null {
  if (!iso) return null;

  const prefix = kind === "due" ? "Due" : "Expected";
  const dayDiff = calendarDaysFromToday(iso);

  if (dayDiff == null) {
    const absolute = formatDateLabel(iso);
    return absolute ? `${prefix} ${absolute}` : null;
  }

  if (dayDiff < 0) {
    const overdueDays = -dayDiff;
    return overdueDays === 1 ? "Overdue by 1 day" : `Overdue by ${overdueDays} days`;
  }

  if (dayDiff === 0) return `${prefix} today`;
  if (dayDiff === 1) return `${prefix} tomorrow`;
  return `${prefix} in ${dayDiff} days`;
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

function TodaySection({
  title,
  emptyMessage,
  children,
  hideWhenEmpty = false,
}: {
  title: string;
  emptyMessage?: string;
  children: ReactNode;
  hideWhenEmpty?: boolean;
}) {
  const isEmpty = children == null;

  if (hideWhenEmpty && isEmpty) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
        {title}
      </h2>
      {isEmpty ? (
        emptyMessage ? (
          <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-muted)]">
            {emptyMessage}
          </p>
        ) : null
      ) : (
        children
      )}
    </section>
  );
}

function MoreItemsIndicator({ total, shown }: { total: number; shown: number }) {
  const hidden = total - shown;
  if (hidden <= 0) return null;
  return (
    <p className="pt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">+{hidden} more</p>
  );
}

function BriefingBlock({ briefing }: { briefing: TodayBriefing }) {
  const dateLabel = formatDateLabel(briefing.briefingDate);
  const typeLabel = formatDisplayLabel(briefing.briefingType);
  const meta = [dateLabel, typeLabel].filter(Boolean).join(" · ");
  const { preview, remainder } = splitBriefingContent(briefing.content);

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
          Daily briefing
        </p>
        <h2 className="break-words text-[length:var(--ds-text-xl)] font-semibold leading-snug tracking-tight text-[var(--ds-text-primary)]">
          {briefing.title}
        </h2>
        {meta ? (
          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">{meta}</p>
        ) : null}
      </div>
      {preview ? (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap break-words text-[length:var(--ds-text-base)] leading-relaxed text-[var(--ds-text-primary)]">
            {preview}
          </p>
          {remainder ? (
            <details className="group">
              <summary className="cursor-pointer list-none text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="underline decoration-[var(--ds-border)] underline-offset-2 group-open:no-underline">
                  Read full briefing
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap break-words text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-primary)]">
                {remainder}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function TaskRow({ task }: { task: TodayTask }) {
  const due = formatOperationalDateMeta(task.dueAt, "due");
  const priority = formatDisplayLabel(task.priorityLevel);
  const meta = [priority, due].filter(Boolean).join(" · ");
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <p className="break-words text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
        {task.title}
      </p>
      {meta ? (
        <p className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">{meta}</p>
      ) : null}
    </li>
  );
}

function WaitingOnRow({ item }: { item: TodayWaitingOn }) {
  const expected = formatOperationalDateMeta(item.expectedResponseAt, "expected");
  const who = item.waitingOnName?.trim() || item.waitingOnContact?.trim() || null;
  const meta = [who, expected].filter(Boolean).join(" · ");
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <p className="break-words text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
        {item.title}
      </p>
      {meta ? (
        <p className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">{meta}</p>
      ) : null}
    </li>
  );
}

function ProjectRow({ project }: { project: TodayProject }) {
  return (
    <li className="py-2">
      <p className="break-words text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
        {project.name}
      </p>
    </li>
  );
}

function StreamRow({ stream }: { stream: TodayStream }) {
  return (
    <li className="py-2">
      <p className="break-words text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
        {stream.name}
      </p>
    </li>
  );
}

/** Borderless operational list — paired inside a single focus band when needed. */
function FocusList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col divide-y divide-[color-mix(in_oklab,var(--ds-border)_55%,transparent)]">{children}</ul>;
}

function ContextList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col">{children}</ul>;
}

export default async function TodayPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { tasks, waitingOns, projects, streams, latestBriefing } = normalizeTodayPageData(
    await fetchTodayPageData(user.id),
  );

  const visibleTasks = tasks.slice(0, FOCUS_LIST_LIMIT);
  const visibleWaitingOns = waitingOns.slice(0, FOCUS_LIST_LIMIT);
  const hasContext = projects.length > 0 || streams.length > 0;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
      <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Today</p>

      <div className="mt-5 flex flex-col gap-6 sm:gap-7">
        {latestBriefing ? (
          <BriefingBlock briefing={latestBriefing} />
        ) : (
          <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-muted)]">
            No briefing yet today.
          </p>
        )}

        <div className="flex flex-col gap-5">
          <TodaySection title="Active tasks" emptyMessage="Nothing active right now.">
            {visibleTasks.length > 0 ? (
              <div>
                <FocusList>
                  {visibleTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </FocusList>
                <MoreItemsIndicator total={tasks.length} shown={visibleTasks.length} />
              </div>
            ) : null}
          </TodaySection>

          <TodaySection title="Waiting on" emptyMessage="Nothing blocked on others.">
            {visibleWaitingOns.length > 0 ? (
              <div>
                <FocusList>
                  {visibleWaitingOns.map((item) => (
                    <WaitingOnRow key={item.id} item={item} />
                  ))}
                </FocusList>
                <MoreItemsIndicator total={waitingOns.length} shown={visibleWaitingOns.length} />
              </div>
            ) : null}
          </TodaySection>
        </div>
      </div>

      {hasContext ? (
        <div className="mt-10 flex flex-col gap-7 border-t border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] pt-9 sm:mt-12 sm:gap-8 sm:pt-10">
          <p className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
            Context
          </p>

          <TodaySection title="Active projects" hideWhenEmpty>
            {projects.length > 0 ? (
              <ContextList>
                {projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </ContextList>
            ) : null}
          </TodaySection>

          <TodaySection title="Streams" hideWhenEmpty>
            {streams.length > 0 ? (
              <ContextList>
                {streams.map((stream) => (
                  <StreamRow key={stream.id} stream={stream} />
                ))}
              </ContextList>
            ) : null}
          </TodaySection>
        </div>
      ) : null}
    </main>
  );
}
