"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Label, Textarea } from "@visualify/design-system";
import { contactMailtoHref } from "@/components/contact-form";

/** Tighter than main marketing sections — contact is utility, not a hero. */
const sectionPadSpacing = "px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20";

const sectionAnchorOffsetClass = "scroll-mt-[var(--ds-app-header-height)]";

/** Dark band — page is light-only; copy uses inverse ink (not theme `text-primary`). */
const darkSectionBgClass =
  "border-t border-[color-mix(in_oklab,var(--ds-text-inverse)_10%,transparent)] bg-[var(--ds-charcoal)]";

const darkSectionBodyClass =
  "text-[color-mix(in_oklab,var(--ds-text-inverse)_78%,var(--ds-charcoal))]";

const darkSectionLabelClass =
  "!text-[color-mix(in_oklab,var(--ds-text-inverse)_88%,var(--ds-charcoal))]";

/** Light fields on dark ground — overrides document-tile chrome from the design system. */
const darkSectionFieldClass =
  "!border-[color-mix(in_oklab,var(--ds-text-inverse)_22%,transparent)] !bg-[var(--ds-text-inverse)] !text-[var(--ds-scrim-ink)] !shadow-[0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_12%,transparent)] " +
  "placeholder:!text-[var(--ds-text-muted)] " +
  "enabled:hover:!border-[color-mix(in_oklab,var(--ds-text-inverse)_34%,transparent)] enabled:hover:!bg-[color-mix(in_oklab,var(--ds-text-inverse)_94%,var(--ds-surface-muted))] " +
  "enabled:hover:!shadow-[0_2px_8px_color-mix(in_oklab,var(--ds-scrim-ink)_14%,transparent)] " +
  "disabled:!border-[color-mix(in_oklab,var(--ds-text-inverse)_12%,transparent)] disabled:!bg-[var(--ds-surface-muted)] disabled:!text-[var(--ds-text-muted)]";

export function MarketingContactSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    const payload: { name: string; email: string; message: string; company?: string; source: string } = {
      name,
      email,
      message,
      source: "riskai-marketing",
    };
    if (company) payload.company = company;

    setStatus("loading");
    setFeedback(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setFeedback(data.message ?? "Thanks — your message was sent.");
      form.reset();
    } catch {
      setStatus("error");
      setFeedback("Something went wrong. Please try again.");
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="marketing-contact-heading"
      className={`${sectionPadSpacing} ${sectionAnchorOffsetClass} ${darkSectionBgClass}`}
    >
      <div className="mx-auto max-w-xl">
        <h2 id="marketing-contact-heading" className="ds-heading-2 ds-heading-2--inverse">
          Prefer to talk it through?
        </h2>
        <p className={`mt-4 text-base leading-snug sm:leading-relaxed ${darkSectionBodyClass}`}>
          Tell us about your project and we’ll show you exactly how RiskAI would model it.
        </p>

        {status === "success" ? (
          <div className="mt-6 space-y-6">
            <p
              className="text-center text-[length:var(--ds-text-base)] leading-relaxed text-[var(--ds-text-inverse)]"
              role="status"
              aria-live="polite"
            >
              {feedback ?? ""}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => {
                setStatus("idle");
                setFeedback(null);
              }}
            >
              Send another message
            </Button>
          </div>
        ) : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="marketing-contact-name" className={darkSectionLabelClass}>
                Name
              </Label>
              <Input
                id="marketing-contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your name"
                disabled={status === "loading"}
                className={darkSectionFieldClass}
              />
            </div>
            <div>
              <Label htmlFor="marketing-contact-email" className={darkSectionLabelClass}>
                Email
              </Label>
              <Input
                id="marketing-contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                disabled={status === "loading"}
                className={darkSectionFieldClass}
              />
            </div>
            <div>
              <Label htmlFor="marketing-contact-company" className={darkSectionLabelClass}>
                Company (optional)
              </Label>
              <Input
                id="marketing-contact-company"
                name="company"
                type="text"
                autoComplete="organization"
                disabled={status === "loading"}
                className={darkSectionFieldClass}
              />
            </div>
            <div>
              <Label htmlFor="marketing-contact-message" className={darkSectionLabelClass}>
                Message
              </Label>
              <Textarea
                id="marketing-contact-message"
                name="message"
                required
                rows={4}
                placeholder="How can we help?"
                disabled={status === "loading"}
                className={darkSectionFieldClass}
              />
            </div>

            {feedback && status === "error" ? (
              <p
                className="text-center text-[13px] leading-relaxed text-red-300"
                role="status"
                aria-live="polite"
              >
                {feedback}
              </p>
            ) : null}

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={status === "loading"}
                className="w-full sm:w-auto"
              >
                {status === "loading" ? "Sending…" : "Send message"}
              </Button>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-[color-mix(in_oklab,var(--ds-text-inverse)_14%,transparent)]" />
              <span
                className={`shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] ${darkSectionBodyClass}`}
              >
                or
              </span>
              <div className="h-px flex-1 bg-[color-mix(in_oklab,var(--ds-text-inverse)_14%,transparent)]" />
            </div>

            <a
              href={contactMailtoHref()}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-[var(--ds-radius-sm)] border border-[color-mix(in_oklab,var(--ds-text-inverse)_22%,transparent)] bg-transparent px-4 text-[15px] font-medium text-[var(--ds-text-inverse)] transition-all duration-150 ease-out hover:border-[color-mix(in_oklab,var(--ds-text-inverse)_34%,transparent)] hover:bg-[color-mix(in_oklab,var(--ds-text-inverse)_8%,transparent)] active:scale-[0.99]"
            >
              Send an email instead
            </a>
            <p className={`text-center text-[12px] leading-relaxed ${darkSectionBodyClass}`}>
              We’ll respond as soon as we can.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
