export type FetchedProjectWorkspaceId = {
  projectId: string;
  workspaceId: string;
};

/**
 * Return a fetched `visualify_projects.workspace_id` only when it belongs to the
 * project currently in the URL. React state from the previous project must not
 * leak across client-side navigations (rail workspace links/highlights).
 */
export function resolveFetchedProjectWorkspaceId(
  fetched: FetchedProjectWorkspaceId | null,
  projectIdInUrl: string | null
): string | null {
  if (!projectIdInUrl || fetched?.projectId !== projectIdInUrl) {
    return null;
  }
  return fetched.workspaceId;
}
