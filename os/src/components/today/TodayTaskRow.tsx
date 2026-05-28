"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { taskPriorityLabel } from "@/components/projects/task-display";
import { TaskMetaInline } from "@/components/tasks/TaskMetaInline";
import type { TodayTask, TodayTaskReason } from "@/lib/today-data";
import { osTaskDetailPath } from "@/lib/os-routes";
import {
  completeTaskFromFormAction,
  type TaskRowActionFormState,
} from "@/lib/os/tasks-actions";

type TodayTaskRowProps = {
  task: TodayTask;
  projectName: string | null;
  reason?: TodayTaskReason;
};

function todayReasonLabel(reason: TodayTaskReason | undefined): string | null {
  switch (reason) {
    case "overdue":
      return "Overdue";
    case "due_today":
      return "Due today";
    case "critical":
      return "Critical";
    case "high_priority":
      return "High priority";
    default:
      return null;
  }
}

export function TodayTaskRow({ task, projectName, reason }: TodayTaskRowProps) {
  const router = useRouter();
  const priority = taskPriorityLabel(task.priorityLevel);
  const taskHref = osTaskDetailPath(task.id);

  const [completeState, completeAction, completePending] = useActionState<
    TaskRowActionFormState | null,
    FormData
  >(completeTaskFromFormAction, null);

  useEffect(() => {
    if (completeState && !completeState.error) {
      router.refresh();
    }
  }, [completeState, router]);

  const metaParts: string[] = [];
  if (projectName) metaParts.push(projectName);
  const reasonLabel = todayReasonLabel(reason);
  if (reasonLabel) metaParts.push(reasonLabel);
  if (priority && priority !== reasonLabel) metaParts.push(priority);

  const body = (
    <>
      <p className="os-today-row__title break-words text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
        {task.title}
      </p>
      <TaskMetaInline
        items={metaParts}
        className="os-today-row__meta text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-secondary)]"
        separatorClassName="os-today-row__meta-sep"
        firstItemClassName={projectName ? "os-today-row__project" : undefined}
      />
      {completeState?.error ? (
        <p
          className="os-today-row__error mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]"
          role="alert"
        >
          {completeState.error}
        </p>
      ) : null}
    </>
  );

  return (
    <li className="os-today-row os-today-task-row py-3 first:pt-0 last:pb-0 max-md:py-0">
      <div className="os-today-task-row__inner">
        <Link
          href={taskHref}
          className="os-today-task-row__main os-today-row__link rounded-[8px] transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_70%,var(--ds-bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-text-secondary)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-surface)]"
          aria-label={`Open task details: ${task.title}`}
        >
          <div className="os-today-row__body">{body}</div>
        </Link>

        <form action={completeAction} className="os-today-task-row__complete-form">
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            disabled={completePending}
            className="os-today-task-row__complete border border-[color-mix(in_oklab,var(--ds-border)_72%,transparent)] bg-[var(--ds-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-text-secondary)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-surface)]"
            aria-label={`Mark task complete: ${task.title}`}
            title="Complete task"
          >
            <span className="os-today-task-row__check" aria-hidden>
              {completePending ? "…" : "✓"}
            </span>
            <span className="sr-only">Mark task complete</span>
          </button>
        </form>
      </div>
    </li>
  );
}
