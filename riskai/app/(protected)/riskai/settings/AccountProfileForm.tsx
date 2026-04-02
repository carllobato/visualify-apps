"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_PROFILE_UPDATED_EVENT } from "@/lib/onboarding/types";
import { saveUserProfileThroughApi } from "@/lib/profiles/profileDb";
import { Button, Callout, Label } from "@visualify/design-system";
import {
  projectSettingsFieldWidthClass,
  projectSettingsInputClass,
} from "@/components/project/projectSettingsDsFormClasses";

const SAVED_RESET_DELAY_MS = 2500;

type Props = {
  initialFirstName?: string | null;
  initialLastName?: string | null;
  initialCompany?: string | null;
  initialRole?: string | null;
};

export function AccountProfileForm({
  initialFirstName = "",
  initialLastName = "",
  initialCompany = "",
  initialRole = "",
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [company, setCompany] = useState(initialCompany ?? "");
  const [role, setRole] = useState(initialRole ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const co = company.trim();
    if (!fn || !ln || !co) {
      setStatus("error");
      setMessage("First name, surname, and company are required.");
      return;
    }
    const { error: errMsg } = await saveUserProfileThroughApi({
      first_name: fn,
      last_name: ln,
      company: co,
      role: role.trim() || null,
    });
    if (errMsg) {
      setStatus("error");
      setMessage(errMsg);
      return;
    }
    setStatus("saved");
    setMessage("Profile updated. This will appear as “Triggered by” on Run Data.");
    window.dispatchEvent(new CustomEvent(ACCOUNT_PROFILE_UPDATED_EVENT));
    router.refresh();
  }

  useEffect(() => {
    if (status !== "saved") return;
    const id = setTimeout(() => {
      setStatus("idle");
      setMessage(null);
    }, SAVED_RESET_DELAY_MS);
    return () => clearTimeout(id);
  }, [status]);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="profile-first-name" className="!mb-1">
          First name{" "}
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
        </Label>
        <input
          id="profile-first-name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={projectSettingsInputClass(false)}
          placeholder="First name"
          autoComplete="given-name"
          required
        />
      </div>
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="profile-last-name" className="!mb-1">
          Surname{" "}
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
        </Label>
        <input
          id="profile-last-name"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={projectSettingsInputClass(false)}
          placeholder="Surname"
          autoComplete="family-name"
          required
        />
      </div>
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="profile-company" className="!mb-1">
          Company{" "}
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
        </Label>
        <input
          id="profile-company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={projectSettingsInputClass(false)}
          placeholder="Company"
          autoComplete="organization"
          required
        />
      </div>
      <div className={projectSettingsFieldWidthClass("sm")}>
        <Label htmlFor="profile-role" className="!mb-1">
          Role
        </Label>
        <input
          id="profile-role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={projectSettingsInputClass(false)}
          placeholder="e.g. Risk manager"
          autoComplete="organization-title"
        />
      </div>
      {message && (
        <Callout
          status={status === "error" ? "danger" : "success"}
          role="status"
          className="text-[length:var(--ds-text-sm)]"
        >
          {message}
        </Callout>
      )}
      <Button type="submit" variant="primary" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save profile"}
      </Button>
    </form>
  );
}
