import type { OsTask } from "@/lib/os/tasks-data";

/** Matches `OS_TASK_STATUS.active` in tasks-data (client-safe literal). */
const ACTIVE_TASK_STATUS = "active";

export type ProjectTaskBoardColumnId = "overdue" | "due_today" | "upcoming";

export type ProjectTaskBoardColumn = {
  id: ProjectTaskBoardColumnId;
  label: string;
  tasks: OsTask[];
};

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isTaskDueOnLocalDay(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  return startOfLocalDayMs(target) === startOfLocalDayMs(now);
}

function isTaskOverdueByDueAt(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  return startOfLocalDayMs(target) < startOfLocalDayMs(now);
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function compareBoardTasks(a: OsTask, b: OsTask): number {
  const pa = PRIORITY_RANK[a.priorityLevel?.trim().toLowerCase() ?? ""] ?? 4;
  const pb = PRIORITY_RANK[b.priorityLevel?.trim().toLowerCase() ?? ""] ?? 4;
  if (pa !== pb) return pa - pb;

  const dueA = a.dueAt ? Date.parse(a.dueAt) : Number.NaN;
  const dueB = b.dueAt ? Date.parse(b.dueAt) : Number.NaN;
  if (!Number.isNaN(dueA) && !Number.isNaN(dueB) && dueA !== dueB) {
    return dueA - dueB;
  }
  if (!Number.isNaN(dueA)) return -1;
  if (!Number.isNaN(dueB)) return 1;

  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

/**
 * Groups active project tasks into board columns using `due_at` only.
 * Overdue → Due Today → Upcoming / Open (no due or future due).
 */
export function groupTasksForProjectBoard(
  tasks: readonly OsTask[],
  now: Date = new Date(),
): ProjectTaskBoardColumn[] {
  const overdue: OsTask[] = [];
  const dueToday: OsTask[] = [];
  const upcoming: OsTask[] = [];

  for (const task of tasks) {
    if (task.status !== ACTIVE_TASK_STATUS) continue;

    if (isTaskOverdueByDueAt(task.dueAt, now)) {
      overdue.push(task);
    } else if (isTaskDueOnLocalDay(task.dueAt, now)) {
      dueToday.push(task);
    } else {
      upcoming.push(task);
    }
  }

  overdue.sort(compareBoardTasks);
  dueToday.sort(compareBoardTasks);
  upcoming.sort(compareBoardTasks);

  return [
    { id: "overdue", label: "Overdue", tasks: overdue },
    { id: "due_today", label: "Due Today", tasks: dueToday },
    { id: "upcoming", label: "Upcoming / Open", tasks: upcoming },
  ];
}
