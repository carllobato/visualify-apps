"use client";

import { type FormEvent, useState } from "react";

export const CONTACT_EMAIL = "help@visualify.com.au";
export const CONTACT_SUBJECT = "Visualify — Get in touch";

const inputClassName =
  "w-full rounded-lg border border-black/[0.1] bg-white/92 px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] focus:border-black/[0.2] focus:ring-2 focus:ring-black/[0.06] dark:border-white/[0.14] dark:bg-zinc-950/70 dark:focus:border-white/[0.2] dark:focus:ring-white/[0.08]";

const inputDisabledClassName = "disabled:cursor-not-allowed disabled:opacity-60";

export function contactMailtoHref(body?: string): string {
  const q = new URLSearchParams();
  q.set("subject", CONTACT_SUBJECT);
  if (body) q.set("body", body);
  return `mailto:${CONTACT_EMAIL}?${q.toString()}`;
}

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    setStatus("loading");
    setFeedback(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setFeedback(data.message ?? "Thanks — your message was sent.");
    } catch {
      setStatus("error");
      setFeedback("Something went wrong. Please try again.");
    }
  }

  const busy = status === "loading";
  const done = status === "success";

  if (done) {
    return (
      <div className="space-y-6">
        <p
          className="text-center text-[17px] leading-relaxed text-foreground"
          role="status"
          aria-live="polite"
        >
          {feedback ?? ""}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setFeedback(null);
          }}
          className="w-full cursor-pointer rounded-lg bg-foreground py-2.5 text-[15px] font-semibold text-background shadow-sm ring-1 ring-black/[0.08] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/25 hover:ring-black/[0.12] active:translate-y-0 active:scale-[0.99] active:shadow-md dark:bg-white dark:text-zinc-950 dark:shadow-md dark:shadow-black/30 dark:ring-white/25 dark:hover:shadow-lg dark:hover:shadow-white/20 dark:hover:ring-white/35"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cf-name" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Name
        </label>
        <input
          id="cf-name"
          name="name"
          type="text"
          autoComplete="name"
          autoFocus
          required
          disabled={busy}
          className={`${inputClassName} ${inputDisabledClassName}`}
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="cf-email" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Email
        </label>
        <input
          id="cf-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={busy}
          className={`${inputClassName} ${inputDisabledClassName}`}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="cf-message" className="mb-1.5 block text-[13px] font-medium text-foreground">
          Message
        </label>
        <textarea
          id="cf-message"
          name="message"
          rows={4}
          required
          disabled={busy}
          className={`min-h-[7.5rem] w-full resize-y ${inputClassName} ${inputDisabledClassName}`}
          placeholder="How can we help?"
        />
      </div>
      {feedback && status === "error" ? (
        <p
          className="text-center text-[13px] leading-relaxed text-red-600 dark:text-red-400"
          role="status"
          aria-live="polite"
        >
          {feedback}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 w-full cursor-pointer rounded-lg bg-foreground py-2.5 text-[15px] font-semibold text-background shadow-sm ring-1 ring-black/[0.08] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/25 hover:ring-black/[0.12] active:translate-y-0 active:scale-[0.99] active:shadow-md disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:shadow-md dark:shadow-black/30 dark:ring-white/25 dark:hover:shadow-lg dark:hover:shadow-white/20 dark:hover:ring-white/35"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.1]" />
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">or</span>
        <div className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      </div>
      <a
        href={contactMailtoHref()}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-black/[0.15] bg-transparent px-4 text-[15px] font-medium text-foreground/85 transition-all duration-200 ease-out hover:border-black/[0.28] hover:bg-black/[0.04] hover:text-foreground active:scale-[0.99] dark:border-white/[0.18] dark:text-foreground/85 dark:hover:border-white/[0.28] dark:hover:bg-white/[0.06] dark:hover:text-foreground"
      >
        Send an email instead
      </a>
      <p className="pt-1 text-center text-[12px] leading-relaxed text-muted">
        We’ll respond as soon as we can.
      </p>
    </form>
  );
}
