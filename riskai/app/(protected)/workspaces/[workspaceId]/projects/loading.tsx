import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";

/** Nested fallback while the Workspace Projects list loads; header stays from the parent layout. */
export default function WorkspaceProjectsLoading() {
  return <NeutralRiskaiLoading srLabel="Loading projects" />;
}
