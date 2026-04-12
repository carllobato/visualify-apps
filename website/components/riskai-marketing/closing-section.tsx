"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@visualify/design-system";
import { contactMailtoHref } from "@/components/contact-form";
import {
  MarketingScrollRevealGroup,
  MarketingScrollRevealItem,
} from "@/components/marketing-scroll-reveal";
import {
  bodySecondaryClass,
  containerWideClass,
  linkPrimaryClass,
  RISKAI_APP_URL,
  sectionAnchorOffsetClass,
  sectionHeadingClass,
  surfacePageClass,
} from "@/components/riskai-marketing/constants";

const fieldClass =
  "w-full rounded-[var(--ds-radius-sm)] border border-[color-mix(in_oklab,var(--ds-border-subtle)_88%,transparent)] bg-[var(--ds-surface)] px-3.5 py-2.5 text-[length:var(--ds-text-base)] text-[var(--ds-text-primary)] shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_4%,transparent)] outline-none transition-[border-color,box-shadow] " +
  "placeholder:text-[var(--ds-text-muted)] focus:border-[color-mix(in_oklab,var(--ds-primary)_45%,var(--ds-border-subtle))] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--ds-primary)_18%,transparent)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--ds-text-primary)]";

export function ClosingSection() {
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
      aria-labelledby="closing-heading"
      className={`border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_55%,transparent)] ${surfacePageClass} px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28 ${sectionAnchorOffsetClass}`}
    >
      <MarketingScrollRevealGroup className={containerWideClass}>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14 xl:gap-16">
          <MarketingScrollRevealItem index={0} className="lg:col-span-5">
            <h2 id="closing-heading" className={sectionHeadingClass}>
              Start with your project
            </h2>
            <p className={`mt-5 max-w-[36ch] text-pretty text-[length:var(--ds-text-base)] leading-relaxed sm:mt-4 ${bodySecondaryClass}`}>
              Model your risks, test decisions, and understand your exposure from day one.
            </p>
            <div className="mt-8 sm:mt-7">
              <a href={RISKAI_APP_URL} className={`${linkPrimaryClass} w-full justify-center sm:inline-flex sm:w-auto`} rel="noopener noreferrer" target="_blank">
                Try RiskAI
              </a>
            </div>
            <p className={`mt-8 max-w-[36ch] border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_60%,transparent)] pt-8 text-[length:var(--ds-text-sm)] leading-relaxed sm:mt-7 sm:pt-7 ${bodySecondaryClass}`}>
              Prefer to talk through scope, enterprise rollout, or a tailored walkthrough? Send a short note — we’ll come
              back to you.
            </p>
          </MarketingScrollRevealItem>

          <MarketingScrollRevealItem index={1} className="lg:col-span-7">
            <Card
              variant="default"
              className="border border-[color-mix(in_oklab,var(--ds-border-subtle)_75%,transparent)] bg-[var(--ds-surface)] shadow-[0_12px_40px_-18px_color-mix(in_oklab,var(--ds-scrim-ink)_12%,transparent)]"
            >
              <CardContent className="px-5 py-7 sm:px-7 sm:py-8">
                <h3 className="text-base font-semibold text-[var(--ds-text-primary)]">Enquiry</h3>
                <p className={`mt-1.5 text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                  Briefly describe your project or question — including if you arrived from Talk to us on pricing.
                </p>

                {status === "success" ? (
                  <div className="mt-6 space-y-5">
                    <p className="text-[length:var(--ds-text-base)] leading-relaxed text-[var(--ds-text-primary)]" role="status" aria-live="polite">
                      {feedback ?? ""}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="w-full sm:w-auto"
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
                      <Label htmlFor="closing-contact-name" className={labelClass}>
                        Name
                      </Label>
                      <Input
                        id="closing-contact-name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Your name"
                        disabled={status === "loading"}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label htmlFor="closing-contact-email" className={labelClass}>
                        Email
                      </Label>
                      <Input
                        id="closing-contact-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@company.com"
                        disabled={status === "loading"}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label htmlFor="closing-contact-company" className={labelClass}>
                        Company (optional)
                      </Label>
                      <Input
                        id="closing-contact-company"
                        name="company"
                        type="text"
                        autoComplete="organization"
                        disabled={status === "loading"}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <Label htmlFor="closing-contact-message" className={labelClass}>
                        Message
                      </Label>
                      <Textarea
                        id="closing-contact-message"
                        name="message"
                        required
                        rows={4}
                        placeholder="How can we help?"
                        disabled={status === "loading"}
                        className={fieldClass}
                      />
                    </div>

                    {feedback && status === "error" ? (
                      <p className="text-center text-[13px] leading-relaxed text-red-600" role="status" aria-live="polite">
                        {feedback}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-4">
                      <Button type="submit" variant="primary" size="md" disabled={status === "loading"} className="w-full sm:w-auto">
                        {status === "loading" ? "Sending…" : "Send message"}
                      </Button>
                      <span className={`text-center text-[length:var(--ds-text-sm)] sm:text-left ${bodySecondaryClass}`}>
                        or{" "}
                        <a href={contactMailtoHref()} className="font-medium text-[var(--ds-text-primary)] underline underline-offset-2 hover:text-[var(--ds-text-secondary)]">
                          email us
                        </a>
                      </span>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </MarketingScrollRevealItem>
        </div>
      </MarketingScrollRevealGroup>
    </section>
  );
}
