"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Input, Label } from "@visualify/design-system";
import { ReportProjectStageSelect } from "@/components/project/report/ReportProjectStageSelect";
import {
  REPORT_PROJECT_STAGE_DEFAULT,
  type ReportProjectStage,
} from "@/lib/projects/report-project-stages";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import { REPORT_ROUTES } from "@/lib/report-routes";

type ReportProjectSettingsFormProps = {
  project: ReportProjectListItem;
};

export function ReportProjectSettingsForm({ project }: ReportProjectSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [stage, setStage] = useState<ReportProjectStage>(
    project.stage ?? REPORT_PROJECT_STAGE_DEFAULT,
  );
  const [code, setCode] = useState(project.code ?? "");
  const [location, setLocation] = useState(project.location ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(project.name);
    setStage(project.stage ?? REPORT_PROJECT_STAGE_DEFAULT);
    setCode(project.code ?? "");
    setLocation(project.location ?? "");
    setSaved(false);
    setError(null);
  }, [project]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          stage,
          code: code.trim(),
          location: location.trim(),
        }),
      });

      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (response.status === 400 && json.redirectTo === REPORT_ROUTES.selectWorkspace) {
        router.push(REPORT_ROUTES.selectWorkspace);
        return;
      }

      if (!response.ok) {
        setError(json.error ?? "Could not save project settings.");
        setLoading(false);
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-settings-project-name">Project name</Label>
        <Input
          id="report-settings-project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          disabled={loading}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-settings-project-stage">Stage</Label>
        <ReportProjectStageSelect
          id="report-settings-project-stage"
          value={stage}
          onChange={setStage}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-settings-project-code">
          Project code <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
        </Label>
        <Input
          id="report-settings-project-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="e.g. SYD1"
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-settings-project-location">
          Project location{" "}
          <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
        </Label>
        <Input
          id="report-settings-project-location"
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

      {saved ? (
        <Callout status="success" className="text-[length:var(--ds-text-sm)]">
          Project settings saved.
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
