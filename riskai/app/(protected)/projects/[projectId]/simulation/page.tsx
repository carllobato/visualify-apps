"use client";

import { useParams } from "next/navigation";
import SimulationPage from "../../../simulation/SimulationPageContent";

export default function ProjectSimulationPage() {
  const params = useParams();
  const raw = params?.projectId;
  const projectId = Array.isArray(raw) ? raw[0] : typeof raw === "string" ? raw : null;
  return <SimulationPage projectId={projectId} />;
}
