"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  completeTaskFromFormAction,
  type TaskRowActionFormState,
} from "@/lib/os/tasks-actions";
import { TaskMetaInline } from "@/components/tasks/TaskMetaInline";

type AllTasksRowProps = {
  taskId: string;
  title: string;
  meta: string[];
  href: string;
};

export function AllTasksRow({ taskId, title, meta, href }: AllTasksRowProps) {
  const router = useRouter();
  const [completeState, completeAction, completePending] = useActionState<
    TaskRowActionFormState | null,
    FormData
  >(completeTaskFromFormAction, null);

  useEffect(() => {
    if (completeState && !completeState.error) {
      router.refresh();
    }
  }, [completeState, router]);

  return (
    <li className="flex items-start gap-3 px-4 py-3 first:pt-3 last:pb-3 max-md:px-3">
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="inline-flex min-w-0 max-w-full rounded-[6px] px-0.5 py-0.5 text-[var(--ds-text-primary)] transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_70%,var(--ds-bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-text-secondary)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-surface)]"
          aria-label={`Open task details: ${title}`}
          title="Open task details"
        >
          <p className="truncate text-[length:var(--ds-text-sm)] font-medium leading-snug">
            {title}
          </p>
        </Link>
        <TaskMetaInline
          items={meta}
          className="mt-0.5 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-secondary)]"
          separatorClassName="text-[var(--ds-text-muted)]"
        />
        {completeState?.error ? (
          <p
            className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]"
            role="alert"
          >
            {completeState.error}
          </p>
        ) : null}
      </div>
      <form action={completeAction} className="shrink-0">
        <input type="hidden" name="id" value={taskId} />
        <button
          type="submit"
          disabled={completePending}
          className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--ds-border)_72%,transparent)] bg-[var(--ds-surface)] text-[var(--ds-text-secondary)] transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface)_72%,var(--ds-bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-text-secondary)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-surface)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Mark task complete: ${title}`}
          title="Mark complete"
        >
          <span aria-hidden>{completePending ? "…" : "✓"}</span>
          <span className="sr-only">Mark task complete</span>
        </button>
      </form>
    </li>
  );
}
