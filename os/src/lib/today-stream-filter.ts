import type { TodayProject, TodayStream, TodayTask } from "@/lib/today-data";
import { itemBelongsToStream, projectIdsSetForStream } from "@/lib/os/stream-linkage";
import { OS_ROUTES } from "@/lib/os-routes";

export type TodayStreamFilter =
  | { kind: "all" }
  | { kind: "stream"; streamId: string; stream: TodayStream };

/**
 * Resolves `?stream=` against the user's active streams.
 * Invalid, archived (not in list), or missing params fall back to All.
 */
export function resolveTodayStreamFilter(
  streamParam: string | string[] | undefined,
  activeStreams: TodayStream[],
): TodayStreamFilter {
  const raw = Array.isArray(streamParam) ? streamParam[0] : streamParam;
  const trimmed = raw?.trim();

  if (!trimmed || trimmed.toLowerCase() === "all") {
    return { kind: "all" };
  }

  const stream = activeStreams.find((s) => s.id === trimmed);
  if (!stream) {
    return { kind: "all" };
  }

  return { kind: "stream", streamId: stream.id, stream };
}

export function filterTasksByTodayStream(
  tasks: TodayTask[],
  filter: TodayStreamFilter,
  projects: readonly TodayProject[] = [],
): TodayTask[] {
  if (filter.kind === "all") {
    return tasks;
  }

  const projectIds = projectIdsSetForStream(projects, filter.streamId);
  return tasks.filter((task) => itemBelongsToStream(task, filter.streamId, projectIds));
}

/** Canonical Today URL for a stream focus chip. */
export function todayStreamFilterHref(streamId: "all" | string): string {
  if (streamId === "all") {
    return OS_ROUTES.today;
  }

  return `${OS_ROUTES.today}?stream=${encodeURIComponent(streamId)}`;
}
