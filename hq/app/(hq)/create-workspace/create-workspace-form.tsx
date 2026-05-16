"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  dsNativeSelectFieldClassName,
  FieldError,
  HelperText,
  Input,
  Label,
} from "@visualify/design-system";
import {
  WORKSPACE_CREATE_TYPE_DESCRIPTIONS,
  WORKSPACE_CREATE_TYPE_OPTIONS,
  type WorkspaceCreateType,
} from "@/types/workspace-create";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceCreateType>("organisation");
  const [nameError, setNameError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Workspace name is required.");
      return;
    }
    setNameError(null);
    setWebsiteError(null);
    setSubmitting(true);

    const websiteTrimmed = website.trim();
    const payload: {
      name: string;
      workspace_type: WorkspaceCreateType;
      website_url?: string;
    } = {
      name: trimmed,
      workspace_type: workspaceType,
    };
    if (websiteTrimmed) {
      payload.website_url = websiteTrimmed;
    }

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!res.ok) {
        const message = data.message ?? data.error ?? "Could not create workspace.";
        if (res.status === 400 && data.error === "Invalid website URL") {
          setWebsiteError("Enter a valid website URL (for example https://example.com).");
          return;
        }
        setFormError(message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setFormError("Could not create workspace. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="hq-create-workspace-name">Workspace name</Label>
        <Input
          id="hq-create-workspace-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          placeholder="Acme Ltd"
          autoComplete="organization"
          disabled={submitting}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "hq-create-workspace-name-err" : undefined}
        />
        {nameError ? <FieldError id="hq-create-workspace-name-err">{nameError}</FieldError> : null}
      </div>

      <div>
        <Label htmlFor="hq-create-workspace-website">Website</Label>
        <Input
          id="hq-create-workspace-website"
          name="website"
          type="url"
          inputMode="url"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            if (websiteError) setWebsiteError(null);
          }}
          placeholder="https://example.com"
          autoComplete="url"
          disabled={submitting}
          aria-invalid={Boolean(websiteError)}
          aria-describedby={
            websiteError
              ? "hq-create-workspace-website-err"
              : "hq-create-workspace-website-help"
          }
        />
        {websiteError ? (
          <FieldError id="hq-create-workspace-website-err">{websiteError}</FieldError>
        ) : (
          <HelperText id="hq-create-workspace-website-help">
            Optional. Used to help personalise your workspace.
          </HelperText>
        )}
      </div>

      <div>
        <Label htmlFor="hq-create-workspace-type">Workspace type</Label>
        <select
          id="hq-create-workspace-type"
          name="workspace_type"
          className={dsNativeSelectFieldClassName(false)}
          value={workspaceType}
          onChange={(e) => setWorkspaceType(e.target.value as WorkspaceCreateType)}
          disabled={submitting}
          aria-describedby="hq-create-workspace-type-desc"
        >
          {WORKSPACE_CREATE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <HelperText id="hq-create-workspace-type-desc">
          {WORKSPACE_CREATE_TYPE_DESCRIPTIONS[workspaceType]}
        </HelperText>
      </div>

      {formError ? (
        <p role="alert" className="text-[length:var(--ds-text-sm)] text-[var(--ds-status-danger-fg)]">
          {formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
