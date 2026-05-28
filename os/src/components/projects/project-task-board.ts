import type { OsTask } from "@/lib/os/tasks-data";

/** Matches `OS_TASK_STATUS.active` in tasks-data (client-safe literal). */
const ACTIVE_TASK_STATUS = "active";

export type ProjectTaskBoardColumnId = "upcoming" | "working";

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
 * Groups active project tasks into Kanban buckets.
 * Working = overdue + due today, Upcoming = future/no due.
 */
export function groupTasksForProjectBoard(
  tasks: readonly OsTask[],
  now: Date = new Date(),
): ProjectTaskBoardColumn[] {
  const working: OsTask[] = [];
  const upcoming: OsTask[] = [];

  for (const task of tasks) {
    if (task.status !== ACTIVE_TASK_STATUS) continue;

    if (isTaskOverdueByDueAt(task.dueAt, now) || isTaskDueOnLocalDay(task.dueAt, now)) {
      working.push(task);
    } else {
      upcoming.push(task);
    }
  }

  working.sort(compareBoardTasks);
  upcoming.sort(compareBoardTasks);

  return [
    { id: "upcoming", label: "Upcoming", tasks: upcoming },
    { id: "working", label: "Working", tasks: working },
  ];
}
