"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { taskPriorityLabel } from "@/components/projects/task-display";
import type { TodayTask } from "@/lib/today-data";
import { osProjectDetailPath } from "@/lib/os-routes";
import {
  completeTaskFromFormAction,
  type TaskRowActionFormState,
} from "@/lib/os/tasks-actions";

type TodayTaskRowProps = {
  task: TodayTask;
  projectName: string | null;
};

export function TodayTaskRow({ task, projectName }: TodayTaskRowProps) {
  const router = useRouter();
  const priority = taskPriorityLabel(task.priorityLevel);
  const projectId = task.projectId?.trim() || null;
  const href = projectId ? osProjectDetailPath(projectId) : null;

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
  if (priority) metaParts.push(priority);
  metaParts.push("Due today");

  const body = (
    <>
      <p className="os-today-row__title break-words text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
        {task.title}
      </p>
      {metaParts.length > 0 ? (
        <p className="os-today-row__meta text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-secondary)]">
          {metaParts.map((part, index) => (
            <span key={part}>
              {index > 0 ? (
                <span className="os-today-row__meta-sep" aria-hidden>
                  {" "}
                  ·{" "}
                </span>
              ) : null}
              <span className={index === 0 && projectName ? "os-today-row__project" : undefined}>
                {part}
              </span>
            </span>
          ))}
        </p>
      ) : null}
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
        {href ? (
          <Link href={href} className="os-today-task-row__main os-today-row__link">
            <div className="os-today-row__body">{body}</div>
          </Link>
        ) : (
          <div className="os-today-task-row__main">
            <div className="os-today-row__body">{body}</div>
          </div>
        )}

        <form action={completeAction} className="os-today-task-row__complete-form">
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            disabled={completePending}
            className="os-today-task-row__complete"
            aria-label={`Mark “${task.title}” complete`}
          >
            {completePending ? "…" : "Done"}
          </button>
        </form>
      </div>
    </li>
  );
}
