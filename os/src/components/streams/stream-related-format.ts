/** Compact date label for stream detail meta lines (e.g. "12 Mar"). */
export function formatStreamRelatedDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTaskMetaLine(task: {
  dueAt: string | null;
  priorityLevel: string | null;
}): string | null {
  const parts: string[] = [];
  const due = formatStreamRelatedDate(task.dueAt);
  if (due) parts.push(`Due ${due}`);
  const priority = task.priorityLevel?.trim();
  if (priority) {
    const label = priority.replace(/_/g, " ");
    parts.push(label.charAt(0).toUpperCase() + label.slice(1));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatWaitingOnMetaLine(item: {
  waitingOnName: string | null;
  expectedResponseAt: string | null;
}): string | null {
  const parts: string[] = [];
  const who = item.waitingOnName?.trim();
  if (who) parts.push(`Waiting on ${who}`);
  const expected = formatStreamRelatedDate(item.expectedResponseAt);
  if (expected) parts.push(`Expected ${expected}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
