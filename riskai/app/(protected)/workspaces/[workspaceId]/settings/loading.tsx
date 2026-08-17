import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";

/** Nested fallback while Workspace Settings loads; header stays from the parent layout. */
export default function WorkspaceSettingsLoading() {
  return <NeutralRiskaiLoading srLabel="Loading workspace settings" />;
}
