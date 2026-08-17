/**
 * Reporting unit may be saved only when the viewer has Workspace owner/admin
 * capability and the Workspace has exactly one internal Portfolio.
 */
export function canPersistWorkspaceReportingUnit(params: {
  canEditWorkspaceDetails: boolean;
  uniquePortfolioId: string | null;
}): boolean {
  return params.canEditWorkspaceDetails && Boolean(params.uniquePortfolioId?.trim());
}
