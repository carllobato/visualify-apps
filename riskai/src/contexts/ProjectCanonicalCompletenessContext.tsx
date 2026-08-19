"use client";

import { createContext, useContext, type ReactNode } from "react";

const ProjectCanonicalCompletenessContext = createContext<boolean | null>(null);

export function ProjectCanonicalCompletenessProvider({
  complete,
  children,
}: {
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <ProjectCanonicalCompletenessContext.Provider value={complete}>
      {children}
    </ProjectCanonicalCompletenessContext.Provider>
  );
}

/** Null outside `/projects/[projectId]` layout. */
export function useProjectCanonicalCompleteness(): boolean | null {
  return useContext(ProjectCanonicalCompletenessContext);
}
