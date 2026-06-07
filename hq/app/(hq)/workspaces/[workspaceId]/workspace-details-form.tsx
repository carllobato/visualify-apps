"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  dsNativeSelectFieldClassName,
  FieldError,
  Input,
  Label,
} from "@visualify/design-system";
import {
  WORKSPACE_CREATE_TYPE_OPTIONS,
  isWorkspaceCreateType,
  type WorkspaceCreateType,
} from "@/types/workspace-create";

export function WorkspaceDetailsForm({
  workspaceId,
  initialName,
  initialWorkspaceType,
  initialWebsiteUrl,
  readOnly = false,
}: {
  workspaceId: string;
  initialName: string;
  initialWorkspaceType: WorkspaceCreateType;
  initialWebsiteUrl: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [website, setWebsite] = useState(initialWebsiteUrl);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceCreateType>(initialWorkspaceType);
  const [nameError, setNameError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setFormError(null);
    setSuccessMessage(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Workspace name is required.");
      return;
    }
    setNameError(null);
    setWebsiteError(null);
    setSubmitting(true);

    const payload = {
      name: trimmed,
      workspace_type: workspaceType,
      website_url: website.trim(),
    };

    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!res.ok) {
        const message = data.message ?? data.error ?? "Could not save workspace details.";
        if (res.status === 400 && data.error === "Invalid website URL") {
          setWebsiteError("Enter a valid website URL (for example https://example.com).");
          return;
        }
        setFormError(message);
        return;
      }

      setSuccessMessage("Workspace details saved.");
      router.refresh();
    } catch {
      setFormError("Could not save workspace details. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-4" noValidate>
      <div>
        <Label htmlFor="hq-workspace-details-name">Workspace name</Label>
        <Input
          id="hq-workspace-details-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          placeholder="Acme Ltd"
          autoComplete="organization"
          disabled={submitting || readOnly}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "hq-workspace-details-name-err" : undefined}
        />
        {nameError ? <FieldError id="hq-workspace-details-name-err">{nameError}</FieldError> : null}
      </div>

      <div>
        <Label htmlFor="hq-workspace-details-type">Workspace type</Label>
        <select
          id="hq-workspace-details-type"
          name="workspace_type"
          className={dsNativeSelectFieldClassName(false)}
          value={workspaceType}
          onChange={(e) => {
            const v = e.target.value;
            if (isWorkspaceCreateType(v)) setWorkspaceType(v);
          }}
          disabled={submitting || readOnly}
        >
          {WORKSPACE_CREATE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="hq-workspace-details-website">Website</Label>
        <Input
          id="hq-workspace-details-website"
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
          disabled={submitting || readOnly}
          aria-invalid={Boolean(websiteError)}
          aria-describedby={websiteError ? "hq-workspace-details-website-err" : undefined}
        />
        {websiteError ? (
          <FieldError id="hq-workspace-details-website-err">{websiteError}</FieldError>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-[length:var(--ds-text-sm)] text-[var(--ds-status-danger-fg)]">
          {formError}
        </p>
      ) : null}
      {successMessage ? (
        <p role="status" className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          {successMessage}
        </p>
      ) : null}

      {!readOnly ? (
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      ) : null}
    </form>
  );
}
