import { formatTaskDueDate, taskPriorityLabel } from "@/components/projects/task-display";
import type { StreamRelatedTask } from "@/lib/os/stream-related-data";

type StreamTaskKanbanProps = {
  tasks: StreamRelatedTask[];
};

type StreamTaskKanbanColumnId = "upcoming" | "working";

type StreamTaskKanbanColumn = {
  id: StreamTaskKanbanColumnId;
  label: string;
  tasks: StreamRelatedTask[];
};

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
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

function compareBoardTasks(a: StreamRelatedTask, b: StreamRelatedTask): number {
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

function groupTasksForKanban(
  tasks: readonly StreamRelatedTask[],
  now: Date = new Date(),
): StreamTaskKanbanColumn[] {
  const working: StreamRelatedTask[] = [];
  const upcoming: StreamRelatedTask[] = [];

  for (const task of tasks) {
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

export function StreamTaskKanban({ tasks }: StreamTaskKanbanProps) {
  if (tasks.length === 0) {
    return (
      <div className="os-streams-empty">
        <p className="os-streams-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          No active tasks in this stream
        </p>
        <p className="os-streams-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Tasks appear here when linked to this stream directly or through stream projects.
        </p>
      </div>
    );
  }

  const columns = groupTasksForKanban(tasks);

  return (
    <div className="os-streams-board">
      <div className="os-streams-board__scroll" role="region" aria-label="Stream task board">
        {columns.map((column) => (
          <section
            key={column.id}
            className={`os-streams-board__column os-streams-board__column--${column.id}`}
            aria-labelledby={`os-streams-board-${column.id}-heading`}
          >
            <header className="os-streams-board__column-header">
              <h3 id={`os-streams-board-${column.id}-heading`} className="os-streams-board__column-title">
                {column.label}
              </h3>
              <span className="os-streams-board__column-count" aria-label={`${column.tasks.length} tasks`}>
                {column.tasks.length}
              </span>
            </header>
            <div className="os-streams-board__cards">
              {column.tasks.length === 0 ? (
                <div className="os-streams-board__column-empty-wrap">
                  <p className="os-streams-board__column-empty">No tasks in this column</p>
                </div>
              ) : (
                column.tasks.map((task) => {
                  const priority = taskPriorityLabel(task.priorityLevel);
                  const due = formatTaskDueDate(task.dueAt);
                  return (
                    <article key={task.id} className="os-streams-board__card">
                      <p className="os-streams-board__card-title">{task.title}</p>
                      <p className="os-streams-board__card-meta">
                        {priority ? <span>{priority}</span> : null}
                        {priority && due ? (
                          <span className="os-streams-board__card-meta-sep" aria-hidden>
                            ·
                          </span>
                        ) : null}
                        {due ? <span>Due {due}</span> : null}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
