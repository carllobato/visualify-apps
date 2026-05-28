import { formatStreamRelatedDate } from "@/components/streams/stream-related-format";

export const TASK_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export function taskPriorityLabel(priorityLevel: string | null): string | null {
  const key = priorityLevel?.trim().toLowerCase();
  if (!key) return null;
  const match = TASK_PRIORITY_OPTIONS.find((option) => option.value === key);
  if (match) return match.label;
  const label = key.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatTaskDueDate(dueAt: string | null): string | null {
  return formatStreamRelatedDate(dueAt);
}

/** Local `YYYY-MM-DD` for `<input type="date" />` from an ISO due timestamp. */
export function taskDueAtToDateInputValue(dueAt: string | null): string {
  if (!dueAt) return "";
  const parsed = Date.parse(dueAt);
  if (Number.isNaN(parsed)) return "";
  const date = new Date(parsed);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskPrioritySelectValue(priorityLevel: string | null): string {
  const key = priorityLevel?.trim().toLowerCase();
  if (key && TASK_PRIORITY_OPTIONS.some((option) => option.value === key)) {
    return key;
  }
  return "medium";
}
