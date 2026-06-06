"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Input, Label } from "@visualify/design-system";
import { ReportProjectStageSelect } from "@/components/project/report/ReportProjectStageSelect";
import {
  REPORT_PROJECT_STAGE_DEFAULT,
  type ReportProjectStage,
} from "@/lib/projects/report-project-stages";
import { REPORT_ROUTES, reportProjectReportPath } from "@/lib/report-routes";

type CreateReportProjectFormProps = {
  onCancel: () => void;
};

export function CreateReportProjectForm({ onCancel }: CreateReportProjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stage, setStage] = useState<ReportProjectStage>(REPORT_PROJECT_STAGE_DEFAULT);
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { name: trimmedName, stage };
      const trimmedCode = code.trim();
      const trimmedLocation = location.trim();
      if (trimmedCode) body.code = trimmedCode;
      if (trimmedLocation) body.location = trimmedLocation;

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
        project?: { id: string };
      };

      if (response.status === 400 && json.redirectTo === REPORT_ROUTES.selectWorkspace) {
        router.push(REPORT_ROUTES.selectWorkspace);
        return;
      }

      if (!response.ok || !json.project?.id) {
        setError(json.error ?? "Could not create project.");
        setLoading(false);
        return;
      }

      router.push(reportProjectReportPath(json.project.id));
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-project-name">Name</Label>
        <Input
          id="report-project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-project-stage">Stage</Label>
        <ReportProjectStageSelect
          id="report-project-stage"
          value={stage}
          onChange={setStage}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-project-code">
          Code <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
        </Label>
        <Input
          id="report-project-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="e.g. SYD1"
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-project-location">
          Location <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
        </Label>
        <Input
          id="report-project-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Sydney"
          disabled={loading}
        />
      </div>

      {error ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {error}
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create project"}
        </Button>
        <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
