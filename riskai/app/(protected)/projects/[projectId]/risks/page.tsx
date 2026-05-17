"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";
import { RiskRegisterContent } from "../../../risk-register/RiskRegisterContent";

export default function ProjectRisksPage() {
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : null;

  return (
    <Suspense fallback={<NeutralRiskaiLoading variant="main" srLabel="Loading risk register" />}>
      <RiskRegisterContent projectId={projectId} />
    </Suspense>
  );
}
