import "server-only";

/** Active project ids belonging to a stream (`os_projects.stream_id`). */
export function projectIdsForStream(
  projects: readonly { id: string; streamId: string | null }[],
  streamId: string,
): string[] {
  return projects.filter((p) => p.streamId === streamId).map((p) => p.id);
}

/**
 * True when a task or waiting-on is linked directly (`stream_id`) or via a project in the stream.
 */
export function itemBelongsToStream(
  item: { streamId: string | null; projectId: string | null },
  streamId: string,
  projectIdsInStream: ReadonlySet<string>,
): boolean {
  if (item.streamId === streamId) {
    return true;
  }

  if (item.projectId && projectIdsInStream.has(item.projectId)) {
    return true;
  }

  return false;
}

export function projectIdsSetForStream(
  projects: readonly { id: string; streamId: string | null }[],
  streamId: string,
): Set<string> {
  return new Set(projectIdsForStream(projects, streamId));
}
