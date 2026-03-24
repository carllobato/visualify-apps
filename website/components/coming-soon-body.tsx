"use client";

import { useId, useState } from "react";
import { ContactForm } from "@/components/contact-form";
import { EarlyAccessForm } from "@/components/early-access-form";
import { LiquidDialog } from "@/components/liquid-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

type Dialog = "none" | "early-access" | "early-access-success" | "contact";

export function ComingSoonBody() {
  const [dialog, setDialog] = useState<Dialog>("none");
  const [earlyAccessSuccessMessage, setEarlyAccessSuccessMessage] = useState<string | null>(null);
  const earlyAccessTitleId = useId();
  const earlyAccessSuccessTitleId = useId();
  const contactTitleId = useId();

  return (
    <>
      <header className="relative z-20 flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <span className="text-[17px] font-semibold tracking-tight text-foreground sm:text-[18px]">
          Visualify
        </span>
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex min-h-[calc(100svh-3.5rem)] flex-col sm:min-h-[calc(100svh-4rem)]">
        <main className="flex flex-1 flex-col justify-center px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
          <div className="mx-auto w-full max-w-lg">
            <section aria-labelledby="headline">
              <p className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-muted">
                Launching soon
              </p>
              <h1
                id="headline"
                className="mt-5 text-balance text-center text-[2rem] font-medium leading-[1.1] tracking-[0.01em] text-foreground sm:text-[2.5rem] sm:tracking-[0.02em]"
              >
                Clarity, built in.
              </h1>
              <p className="mt-5 text-center text-[17px] leading-relaxed text-muted sm:text-[18px]">
                Visualify is building a more thoughtful approach to modern software — calm, structured,
                and designed for clarity.
              </p>
              <p className="mt-4 text-center text-[15px] font-medium leading-relaxed text-foreground/90 sm:text-[16px]">
                Designed for teams that value clarity, structure, and trust.
              </p>
              <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEarlyAccessSuccessMessage(null);
                    setDialog("early-access");
                  }}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-foreground px-6 text-[15px] font-semibold text-background shadow-sm ring-1 ring-black/[0.08] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/25 hover:ring-black/[0.12] active:translate-y-0 active:scale-[0.99] active:shadow-md dark:bg-white dark:text-zinc-950 dark:shadow-md dark:shadow-black/30 dark:ring-white/25 dark:hover:shadow-lg dark:hover:shadow-white/20 dark:hover:ring-white/35"
                >
                  Request Early Access
                </button>
                <button
                  type="button"
                  onClick={() => setDialog("contact")}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-black/[0.15] bg-transparent px-6 text-[15px] font-medium text-foreground/85 transition-all duration-200 ease-out hover:border-black/[0.28] hover:bg-black/[0.04] hover:text-foreground active:scale-[0.99] dark:border-white/[0.18] dark:text-foreground/85 dark:hover:border-white/[0.28] dark:hover:bg-white/[0.06] dark:hover:text-foreground"
                >
                  Get in Touch
                </button>
              </div>
              <p className="mt-4 text-center text-[13px] text-muted/70">Early access opens soon.</p>
            </section>
          </div>
        </main>

        <footer className="relative z-10 px-4 pb-10 pt-4 text-center sm:px-6 lg:px-8">
          <p className="text-[12px] text-muted">© 2026 Visualify. All rights reserved.</p>
        </footer>
      </div>

      <LiquidDialog
        open={dialog === "early-access"}
        onClose={() => setDialog("none")}
        titleId={earlyAccessTitleId}
        title="Early access"
      >
        <EarlyAccessForm
          onSuccess={(message) => {
            setEarlyAccessSuccessMessage(message);
            setDialog("early-access-success");
          }}
        />
      </LiquidDialog>

      <LiquidDialog
        open={dialog === "early-access-success"}
        onClose={() => {
          setDialog("none");
          setEarlyAccessSuccessMessage(null);
        }}
        titleId={earlyAccessSuccessTitleId}
        title="Thank you"
      >
        <div className="space-y-6">
          <p
            className="text-center text-[17px] leading-relaxed text-foreground"
            role="status"
            aria-live="polite"
          >
            {earlyAccessSuccessMessage ?? ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setDialog("none");
              setEarlyAccessSuccessMessage(null);
            }}
            className="w-full cursor-pointer rounded-lg bg-foreground py-2.5 text-[15px] font-semibold text-background shadow-sm ring-1 ring-black/[0.08] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/25 hover:ring-black/[0.12] active:translate-y-0 active:scale-[0.99] active:shadow-md dark:bg-white dark:text-zinc-950 dark:shadow-md dark:shadow-black/30 dark:ring-white/25 dark:hover:shadow-lg dark:hover:shadow-white/20 dark:hover:ring-white/35"
          >
            Done
          </button>
        </div>
      </LiquidDialog>

      <LiquidDialog
        open={dialog === "contact"}
        onClose={() => setDialog("none")}
        titleId={contactTitleId}
        title="Get in touch"
      >
        <ContactForm />
      </LiquidDialog>
    </>
  );
}
