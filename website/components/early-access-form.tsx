"use client";

import { type FormEvent, useState } from "react";

const SOURCE = "website";

const inputClassName =
  "w-full rounded-lg border border-black/[0.1] bg-white/92 px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] focus:border-black/[0.2] focus:ring-2 focus:ring-black/[0.06] dark:border-white/[0.14] dark:bg-zinc-950/70 dark:focus:border-white/[0.2] dark:focus:ring-white/[0.08]";

const inputDisabledClassName =
  "disabled:cursor-not-allowed disabled:opacity-60";

type EarlyAccessFormProps = {
  /** When set, successful submit calls this and does not keep the form in a “success” state (parent shows a confirmation dialog). */
  onSuccess?: (message: string) => void;
};

export function EarlyAccessForm({ onSuccess }: EarlyAccessFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const jobTitle = String(fd.get("jobTitle") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();

    setStatus("loading");
    setFeedback(null);

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          jobTitle,
          company,
          source: SOURCE,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      const successMessage = data.message ?? "You’re on the list.";
      if (onSuccess) {
        onSuccess(successMessage);
        form.reset();
        setStatus("idle");
        return;
      }

      setStatus("success");
      setFeedback(successMessage);
      form.reset();
    } catch {
      setStatus("error");
      setFeedback("Something went wrong. Please try again.");
    }
  }

  const busy = status === "loading";
  const done = status === "success";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ea-first-name" className="mb-1.5 block text-[13px] font-medium text-foreground">
            First name
          </label>
          <input
            id="ea-first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            autoFocus
            required
            disabled={busy || done}
            className={`${inputClassName} ${inputDisabledClassName}`}
            placeholder="First name"
          />
        </div>
        <div>
          <label htmlFor="ea-last-name" className="mb-1.5 block text-[13px] font-medium text-foreground">
            Last name
          </label>
          <input
            id="ea-last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            disabled={busy || done}
            className={`${inputClassName} ${inputDisabledClassName}`}
            placeholder="Last name"
          />
        </div>
      </div>
      <div>
        <label htmlFor="ea-email" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Email
        </label>
        <input
          id="ea-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={busy || done}
          className={`${inputClassName} ${inputDisabledClassName}`}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="ea-job-title" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Job title <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="ea-job-title"
          name="jobTitle"
          type="text"
          autoComplete="organization-title"
          disabled={busy || done}
          className={`${inputClassName} ${inputDisabledClassName}`}
          placeholder="Your role"
        />
      </div>
      <div>
        <label htmlFor="ea-company" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Company <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="ea-company"
          name="company"
          type="text"
          autoComplete="organization"
          disabled={busy || done}
          className={`${inputClassName} ${inputDisabledClassName}`}
          placeholder="Company name"
        />
      </div>
      {feedback ? (
        <p
          className={
            status === "error"
              ? "text-center text-[13px] leading-relaxed text-red-600 dark:text-red-400"
              : "text-center text-[13px] leading-relaxed text-foreground"
          }
          role="status"
          aria-live="polite"
        >
          {feedback}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || done}
        className="mt-2 w-full cursor-pointer rounded-lg bg-foreground py-2.5 text-[15px] font-semibold text-background shadow-sm ring-1 ring-black/[0.08] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/25 hover:ring-black/[0.12] active:translate-y-0 active:scale-[0.99] active:shadow-md disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:shadow-md dark:shadow-black/30 dark:ring-white/25 dark:hover:shadow-lg dark:hover:shadow-white/20 dark:hover:ring-white/35"
      >
        {busy ? "Submitting…" : done ? "Joined" : "Join Early Access"}
      </button>
      <p className="pt-1 text-center text-[12px] leading-relaxed text-muted">
        We’ll only use your details to share launch updates and early access information.
      </p>
    </form>
  );
}
