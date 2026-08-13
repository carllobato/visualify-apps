/**
 * Portfolio-create alias for the shared creatable-workspace resolver.
 * Prefer {@link resolveCreatableWorkspaceId} for new call sites.
 */
export {
  resolveCreatableWorkspaceId as resolveWorkspaceForPortfolioCreate,
  type ResolveCreatableWorkspaceResult as ResolveWorkspaceForPortfolioCreateResult,
} from "./resolveCreatableWorkspaceId";
