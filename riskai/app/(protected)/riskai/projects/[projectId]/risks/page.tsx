"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";
import { RiskRegisterContent } from "../../../risk-register/RiskRegisterContent";

export default function ProjectRisksPage() {
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : null;

  return (
    <Suspense
      fallback={
        <main className="p-6">
          <LoadingPlaceholderCompact label="Loading risk register" />
        </main>
      }
    >
      <RiskRegisterContent projectId={projectId} />
    </Suspense>
  );
}
