import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  fetchTodayPageData,
  type TodayBriefing,
  type TodayProject,
  type TodayTask,
  type TodayVector,
  type TodayWaitingOn,
} from "@/lib/today-data";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatDateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Humanize enum/snake values for read-only display (e.g. `high` → `High`, `daily` → `Daily`). */
function formatDisplayLabel(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function TodaySection({
  title,
  emptyMessage,
  children,
}: {
  title: string;
  emptyMessage: string;
  children: ReactNode;
}) {
  const isEmpty = children == null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-secondary)]">
        {title}
      </h2>
      {isEmpty ? (
        <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function BriefingBlock({ briefing }: { briefing: TodayBriefing }) {
  const dateLabel = formatDateLabel(briefing.briefingDate);
  const typeLabel = formatDisplayLabel(briefing.briefingType);
  const meta = [dateLabel, typeLabel].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col gap-4 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="break-words text-[length:var(--ds-text-base)] font-medium leading-snug text-[var(--ds-text-primary)]">
          {briefing.title}
        </h3>
        {meta ? (
          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">{meta}</p>
        ) : null}
      </div>
      <div className="whitespace-pre-wrap break-words text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-primary)]">
        {briefing.content}
      </div>
    </article>
  );
}

function TaskRow({ task }: { task: TodayTask }) {
  const due = formatDateLabel(task.dueAt);
  const priority = formatDisplayLabel(task.priorityLevel);
  const meta = [priority, due ? `Due ${due}` : null].filter(Boolean).join(" · ");
  return (
    <li className="border-b border-[var(--ds-border)] py-3.5 last:border-b-0">
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
  const expected = formatDateLabel(item.expectedResponseAt);
  const who = item.waitingOnName?.trim() || item.waitingOnContact?.trim() || null;
  const metaParts: string[] = [];
  if (who) metaParts.push(`Waiting on ${who}`);
  if (expected) metaParts.push(`Expected ${expected}`);
  const meta = metaParts.join(" · ");
  return (
    <li className="border-b border-[var(--ds-border)] py-3.5 last:border-b-0">
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
    <li className="py-2.5">
      <p className="break-words text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
        {project.name}
      </p>
      {project.description ? (
        <p className="mt-1 line-clamp-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
          {project.description}
        </p>
      ) : null}
    </li>
  );
}

function VectorRow({ vector }: { vector: TodayVector }) {
  return (
    <li className="py-2.5">
      <p className="break-words text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
        {vector.name}
      </p>
      {vector.description ? (
        <p className="mt-1 line-clamp-2 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
          {vector.description}
        </p>
      ) : null}
    </li>
  );
}

/** Bordered list for operational focus items (tasks, waiting-ons). */
function FocusList({ children }: { children: ReactNode }) {
  return (
    <ul className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4">
      {children}
    </ul>
  );
}

/** Light list for background context (projects, vectors) — avoids dashboard-style card wall. */
function ContextList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-0.5 pl-0.5">{children}</ul>;
}

export default async function TodayPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { tasks, waitingOns, projects, vectors, latestBriefing } = await fetchTodayPageData(user.id);

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]">
          Today
        </h1>
        <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          What matters now.
        </p>
      </header>

      <TodaySection title="Daily briefing" emptyMessage="No briefing generated yet.">
        {latestBriefing ? <BriefingBlock briefing={latestBriefing} /> : null}
      </TodaySection>

      <TodaySection title="Key tasks" emptyMessage="No key tasks surfaced right now.">
        {tasks.length > 0 ? (
          <FocusList>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </FocusList>
        ) : null}
      </TodaySection>

      <TodaySection title="Waiting ons" emptyMessage="No active dependencies waiting.">
        {waitingOns.length > 0 ? (
          <FocusList>
            {waitingOns.map((item) => (
              <WaitingOnRow key={item.id} item={item} />
            ))}
          </FocusList>
        ) : null}
      </TodaySection>

      <TodaySection title="Active projects" emptyMessage="No active projects yet.">
        {projects.length > 0 ? (
          <ContextList>
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ContextList>
        ) : null}
      </TodaySection>

      <TodaySection title="Vectors" emptyMessage="No active vectors yet.">
        {vectors.length > 0 ? (
          <ContextList>
            {vectors.map((vector) => (
              <VectorRow key={vector.id} vector={vector} />
            ))}
          </ContextList>
        ) : null}
      </TodaySection>
    </main>
  );
}
